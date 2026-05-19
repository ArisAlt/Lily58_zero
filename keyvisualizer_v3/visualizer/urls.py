from django.urls import path
from .views import (
    IndexView, RouteView, UploadView, QmkProxyView,
    VialExportView, LayoutSaveView, LayoutDetailView,
)

urlpatterns = [
    path("",                        IndexView.as_view(),       name="index"),
    path("api/route/",              RouteView.as_view(),       name="api_route"),
    path("api/upload/",             UploadView.as_view(),      name="api_upload"),
    path("api/qmk/<path:path>/",    QmkProxyView.as_view(),    name="api_qmk"),
    path("api/export/vial/",        VialExportView.as_view(),  name="api_export_vial"),
    path("api/layouts/",            LayoutSaveView.as_view(),  name="api_layouts"),
    path("api/layouts/<int:pk>/",   LayoutDetailView.as_view(), name="api_layout_detail"),
]
