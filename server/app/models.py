from django.db import models
from django.core.validators import MaxLengthValidator

class Article(models.Model):

    class Meta:
        constraints: [
            models.UniqueConstraint(fields=["title"], name="unique_title"),
        ]

    title = models.CharField(max_length=255)
    text = models.TextField()
