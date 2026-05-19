"""
views.py — All views and REST API endpoints for KeyVisualizer v3.

Endpoints:
  GET  /                   → index.html
  POST /api/route/         → route KLE → return routing JSON
  POST /api/upload/        → parse info.json upload → return layout JSON
  GET  /api/qmk/<path>/   → proxy to keyboards.qmk.fm
  POST /api/export/vial/  → generate + download Vial ZIP
  POST /api/layouts/       → save layout to SQLite
  GET  /api/layouts/       → list saved layouts
  GET  /api/layouts/<id>/  → load a saved layout
  DELETE /api/layouts/<id>/→ delete a saved layout
"""
import json
import traceback

import requests as req_lib
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import TemplateView

from .board_profiles import BOARD_PROFILES
from .models import Layout
from .router import parse_kle, route_layout
from .vial_export import generate_vial_zip


class IndexView(TemplateView):
    template_name = "visualizer/index.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["board_profiles"] = [
            {"id": bid, "label": b["label"]}
            for bid, b in BOARD_PROFILES.items()
        ]
        ctx["recent_layouts"] = Layout.objects.order_by("-created_at")[:10]
        return ctx


@method_decorator(csrf_exempt, name="dispatch")
class RouteView(View):
    """POST {kle_json, is_split, board_id} → routing result JSON"""

    def post(self, request):
        try:
            data     = json.loads(request.body)
            kle_raw  = data.get("kle_json")
            is_split = bool(data.get("is_split", False))
            board_id = data.get("board_id", "waveshare_2040_plus")

            if isinstance(kle_raw, str):
                kle_raw = json.loads(kle_raw)

            keys   = parse_kle(kle_raw)
            result = route_layout(keys, is_split, board_id)
            result["kle_raw"] = kle_raw
            return JsonResponse(result)

        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=400)


@method_decorator(csrf_exempt, name="dispatch")
class UploadView(View):
    """POST multipart info.json → parsed layout JSON"""

    def post(self, request):
        try:
            f    = request.FILES.get("file")
            data = json.loads(f.read())

            # Support QMK info.json format
            keyboard_name = data.get("keyboard_name", "custom_handwired")
            layouts_raw   = data.get("layouts", {})
            layout_name   = next(iter(layouts_raw), "LAYOUT")
            layout_data   = layouts_raw.get(layout_name, {}).get("layout", [])

            keys = []
            for item in layout_data:
                keys.append({
                    "x":      item.get("x", 0),
                    "y":      item.get("y", 0),
                    "w":      item.get("w", 1),
                    "h":      item.get("h", 1),
                    "cx":     item.get("x", 0) + item.get("w", 1) / 2,
                    "cy":     item.get("y", 0) + item.get("h", 1) / 2,
                    "matrix": item.get("matrix", [0, 0]),
                    "label":  str(item.get("matrix", ["", ""])[0]) + ","
                              + str(item.get("matrix", ["", ""])[1]),
                })

            return JsonResponse({
                "keyboard_name": keyboard_name,
                "layout_name":   layout_name,
                "keys":          keys,
                "raw":           data,
            })

        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=400)


class QmkProxyView(View):
    """GET /api/qmk/<path>/ → proxy QMK API (avoids CORS)"""

    def get(self, request, path):
        url = f"https://keyboards.qmk.fm/v1/keyboards/{path}/info.json"
        try:
            resp = req_lib.get(url, timeout=10)
            return HttpResponse(resp.content, content_type="application/json",
                                status=resp.status_code)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=502)


@method_decorator(csrf_exempt, name="dispatch")
class VialExportView(View):
    """POST routing_result JSON → download Vial ZIP"""

    def post(self, request):
        try:
            routing_result = json.loads(request.body)
            buf, kb_name   = generate_vial_zip(routing_result)
            resp = HttpResponse(buf.read(), content_type="application/zip")
            resp["Content-Disposition"] = (
                f'attachment; filename="{kb_name}_vial.zip"'
            )
            return resp
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=400)


@method_decorator(csrf_exempt, name="dispatch")
class LayoutSaveView(View):
    """POST {name, routing_result} → save; GET → list"""

    def get(self, request):
        layouts = Layout.objects.order_by("-created_at")[:50]
        return JsonResponse({
            "layouts": [
                {
                    "id":           l.id,
                    "name":         l.name,
                    "keyboard_name": l.keyboard_name,
                    "board_id":     l.board_id,
                    "created_at":   l.created_at.isoformat(),
                }
                for l in layouts
            ]
        })

    def post(self, request):
        try:
            data   = json.loads(request.body)
            result = data.get("routing_result", data)
            layout = Layout.objects.create(
                name           = data.get("name", "Untitled"),
                keyboard_name  = result.get("keyboard_name", ""),
                board_id       = result.get("board_used", ""),
                routing_result = result,
            )
            return JsonResponse({
                "id":         layout.id,
                "created_at": layout.created_at.isoformat(),
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


@method_decorator(csrf_exempt, name="dispatch")
class LayoutDetailView(View):
    """GET /api/layouts/<id>/ → load; DELETE → remove"""

    def get(self, request, pk):
        layout = get_object_or_404(Layout, pk=pk)
        return JsonResponse(layout.routing_result)

    def delete(self, request, pk):
        layout = get_object_or_404(Layout, pk=pk)
        layout.delete()
        return JsonResponse({"deleted": True})
