#!/usr/bin/env python

import json
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from app.models import Article

class Command(BaseCommand):
    help = "Imports tiddlers exported in JSON from a TiddlyWiki5"

    def add_arguments(self, parser):
        parser.add_argument("filename", nargs=1, type=str)

    def handle(self, *args, **options):
        tiddlers = import_tiddlers(options["filename"][0])

        for tiddler in tiddlers:
            article = Article(
                article_id=None,
                title=tiddler["title"],
                text=tiddler["text"],
                created_at=parse_tiddler_date(tiddler["created"]),
                last_modified_at=parse_tiddler_date(tiddler["modified"]))

            if tiddler["title"] == "Robin Hartshorne: Algebraic Geometry":
                continue

            print(tiddler)
            article.full_clean()
            article.save()

def import_tiddlers(filename):
    with open(filename) as tiddlerFile:
        jsonEncodedTiddlers = tiddlerFile.read()

    return json.loads(jsonEncodedTiddlers)

def parse_tiddler_date(string):
    year = int(string[0:4])
    month = int(string[4:6])
    day = int(string[6:8])
    hour = int(string[8:10])
    minute = int(string[10:12])
    second = int(string[12:14])
    millisecond = int(string[14:17])

    return datetime(year, month, day, hour, minute, second, millisecond * 1000)

