from django.urls import path
from . import views

urlpatterns = [
    path("get/previews/", views.get_previews, name="previews"),
    path("get/article/", views.get_article, name="article"),
    path("create/article/", views.create_article, name="create-article"),
    path("change/article/", views.change_article, name="change-article"),
]
