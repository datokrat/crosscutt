from django.db import models
from django.core.validators import MaxLengthValidator

class Article(models.Model):

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["article_id"], name="unique_article_id"),
        ]

    article_id = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    text = models.TextField()
