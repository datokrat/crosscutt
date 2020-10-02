from django.shortcuts import render
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import Article
from .permissions import crosscutt_permissions
from django.views.decorators.csrf import csrf_exempt

class ArticleIntegrityException(Exception):
    pass

def get_previews(request):
    return JsonResponse(getPreviewsJson(request.user))

def get_article(request):
    name = request.GET["name"]
    namespace = request.GET["namespace"]
    permissions = get_permissions(request.user, namespace)

    if permissions != "full" and permissions != "readonly":
        return JsonResponse({
            "success": False,
            "reason": "forbidden",
        })

    queryset = Article.objects.filter(Q(namespace=namespace) & (Q(article_id=name) | Q(title=name)))
    if queryset.exists():
        article = queryset.get()
        return JsonResponse({
            "success": True,
            "permissions": permissions,
            "namespace": article.namespace,
            "id": article.article_id,
            "title": article.title,
            "text": article.text,
        })
    else:
        return JsonResponse({
            "success": False,
            "permissions": permissions,
            "reason": "not found",
        })

@csrf_exempt
def create_article(request):
    id = parseId(request.POST["id"])
    title = request.POST["title"]
    text = request.POST["text"]
    namespace = request.POST["namespace"]
    permissions = get_permissions(request.user, namespace)

    if permissions != "full":
        return JsonResponse({
            "success": False,
            "reason": "forbidden",
        })

    try:
        with transaction.atomic():
            article = Article(article_id=id, title=title, text=text, namespace=namespace)
            article.full_clean()
            article.save()
            validateUnique(namespace, id)
            validateUnique(namespace, title)
    except ArticleIntegrityException:
        return JsonResponse({
            "success": False,
            "reason": "ID or title are already taken.",
        })

    return JsonResponse({
        "success": True,
    })

@csrf_exempt
def change_article(request):
    namespace = request.POST["namespace"]
    title = request.POST["title"]
    new_namespace = request.POST["namespace"]
    new_id = parseId(request.POST["new_id"])
    new_title = request.POST["new_title"]
    new_text = request.POST["new_text"]
    permissions = get_permissions(request.user, namespace)

    if permissions != "full":
        return JsonResponse({
            "success": False,
            "reason": "forbidden",
        })


    if not Article.objects.filter(namespace=namespace, title=title).exists():
        return error_json_response("Article with this ID does not exist")

    try:
        with transaction.atomic():
            Article.objects.filter(namespace=namespace, title=title).update(
                article_id=new_id,
                namespace=new_namespace,
                title=new_title,
                text=new_text,
                last_modified_at=timezone.now())
            validateUnique(new_namespace, new_id)
            validateUnique(new_namespace, new_title)
    except ArticleIntegrityException:
        return JsonResponse({
            "success": False,
            "message": "ID or title are already taken.",
        })

    return JsonResponse({"success": True})

def error_json_response(message):
    return JsonResponse({ "error": message })

def getPreviewsJson(user):
    return {
        "previews": [
            { "namespace": article.namespace, "id": article.article_id, "title": article.title, "preview": article.text[:200] }
            for article in Article.objects.all()
            if get_permissions(user, article.namespace) in ["full", "readonly"]
        ]
    }

def validateUnique(namespace, name):
    if name is None:
        return

    if Article.objects.filter(Q(namespace=namespace, article_id=name) | Q(namespace=namespace, title=name)).count() > 1:
        raise ArticleIntegrityException("name " + name + " is not unique")

def parseId(string):
    if len(string) == 0:
        return None
    else:
        return string

def get_permissions(user, namespace):
    username = user.username if user.is_authenticated else None
    return crosscutt_permissions(username, namespace)
