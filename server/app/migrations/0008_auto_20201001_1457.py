# Generated by Django 3.1.1 on 2020-10-01 14:57

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0007_auto_20201001_1433'),
    ]

    operations = [
        migrations.AlterField(
            model_name='article',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name='article',
            name='last_modified_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]