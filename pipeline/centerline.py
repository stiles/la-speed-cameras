#!/usr/bin/env python3
"""
Centerline length for corridor polygons.

The LADOT corridor features are buffered street segments (polygons), so
GeoPandas' `.length` returns the buffer perimeter, roughly twice the corridor
length. This derives a medial-axis skeleton from a Voronoi diagram of the
densified boundary and measures the longest path through it, which tracks the
street centerline even where the corridor bends.
"""

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import Voronoi
from shapely.geometry import LineString, MultiLineString, Point
from shapely.prepared import prep

# Boundary densification step and skeleton edge test, in feet. The corridors are
# buffers of roughly 60-265 ft width, so a 10 ft step resolves the medial axis
# without generating an unwieldy Voronoi diagram.
STEP_FT = 10.0


def _boundary_points(poly, step=STEP_FT):
    """Sample points along every ring of a polygon at a fixed spacing."""
    rings = [poly.exterior, *poly.interiors]
    coords = []
    for ring in rings:
        dense = ring.segmentize(step)
        coords.append(np.asarray(dense.coords)[:-1])
    return np.vstack(coords)


def _skeleton_graph(poly, step=STEP_FT):
    """Build a graph of Voronoi ridges that fall inside the polygon."""
    pts = _boundary_points(poly, step)
    if len(pts) < 4:
        return None, None

    vor = Voronoi(pts)
    verts = vor.vertices
    inside = prep(poly)

    # Keep only finite ridges whose midpoint and endpoints are inside the
    # polygon. Testing the midpoint rejects ridges that cut across a bend.
    edges = []
    for a, b in vor.ridge_vertices:
        if a < 0 or b < 0:
            continue
        pa, pb = verts[a], verts[b]
        seg = LineString([pa, pb])
        if inside.contains(seg):
            edges.append((a, b, seg.length))

    if not edges:
        return None, None

    idx = {}
    rows, cols, data = [], [], []
    for a, b, w in edges:
        for v in (a, b):
            if v not in idx:
                idx[v] = len(idx)
        rows.append(idx[a])
        cols.append(idx[b])
        data.append(w)

    n = len(idx)
    graph = coo_matrix((data, (rows, cols)), shape=(n, n)).tocsr()
    nodes = np.empty((n, 2))
    for v, i in idx.items():
        nodes[i] = verts[v]
    return graph, nodes


def _longest_path(graph, nodes):
    """Return (length, path indices) for the graph's longest shortest path."""
    # Double sweep: the farthest node from an arbitrary start is an endpoint of
    # a longest path in a tree, which the skeleton approximates.
    dist = dijkstra(graph, directed=False, indices=0)
    finite = np.isfinite(dist)
    if not finite.any():
        return 0.0, []
    start = int(np.argmax(np.where(finite, dist, -1)))

    dist, pred = dijkstra(graph, directed=False, indices=start,
                          return_predecessors=True)
    finite = np.isfinite(dist)
    end = int(np.argmax(np.where(finite, dist, -1)))
    length = float(dist[end])

    path, cur = [], end
    while cur != -9999 and cur >= 0:
        path.append(cur)
        if cur == start:
            break
        cur = int(pred[cur])
    return length, path[::-1]


def _extend_to_boundary(poly, pts):
    """Project the end of a skeleton out to the polygon edge.

    The medial axis tapers away from a corridor's flat ends, undershooting by
    up to half the buffer width. Continuing along the final bearing to the
    boundary lands on the cross street the corridor actually terminates at.
    """
    tip, inner = np.asarray(pts[0]), np.asarray(pts[1])
    vec = tip - inner
    norm = np.hypot(*vec)
    if norm == 0:
        return 0.0, tip
    vec /= norm

    # Cast well past any plausible corridor half-width, then clip to the polygon.
    far = tip + vec * 2000.0
    ray = LineString([tip, far]).intersection(poly)
    if ray.is_empty:
        return 0.0, tip
    if ray.geom_type == "MultiLineString":
        # Take the piece still attached to the tip; a bend can split the ray.
        ray = min(ray.geoms, key=lambda s: s.distance(Point(tip)))
    end = np.asarray(ray.coords)[-1]
    return float(np.hypot(*(end - tip))), end


def centerline(poly, step=STEP_FT):
    """Return (length_ft, LineString|None) for a single polygon."""
    graph, nodes = _skeleton_graph(poly, step)
    if graph is None:
        return 0.0, None
    length, path = _longest_path(graph, nodes)
    if len(path) < 2:
        return length, None

    spine = [nodes[i] for i in path]
    head_len, head_pt = _extend_to_boundary(poly, spine[:2])
    tail_len, tail_pt = _extend_to_boundary(poly, spine[::-1][:2])
    coords = [head_pt, *spine, tail_pt]
    return length + head_len + tail_len, LineString(coords)


def centerlines(geoms, step=STEP_FT):
    """Return (lengths_ft, lines) for a sequence of (Multi)Polygons."""
    lengths, lines = [], []
    for geom in geoms:
        if geom is None or geom.is_empty:
            lengths.append(np.nan)
            lines.append(None)
            continue
        # A corridor split by a median can arrive as a MultiPolygon; measure the
        # largest part and keep the rest for reference.
        parts = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
        results = [centerline(p, step) for p in sorted(parts, key=lambda p: -p.area)]
        total = sum(r[0] for r in results[:1])
        segs = [r[1] for r in results if r[1] is not None]
        lengths.append(total)
        lines.append(segs[0] if len(segs) == 1 else (MultiLineString(segs) if segs else None))
    return np.array(lengths), lines
