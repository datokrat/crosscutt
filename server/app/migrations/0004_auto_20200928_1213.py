# Generated by Django 3.1.1 on 2020-09-28 12:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_auto_20200928_1201'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='article_id',
            field=models.CharField(default='1', max_length=255),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='article',
            name='id',
            field=models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
