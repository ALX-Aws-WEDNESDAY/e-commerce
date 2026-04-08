from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserRegisterViewset

router = DefaultRouter()
router.register(r"users", UserRegisterViewset, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/", include("rest_framework.urls")),
]
