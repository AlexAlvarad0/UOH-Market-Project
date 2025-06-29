# Generated by Django 5.0.2 on 2025-06-22 22:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="expiringtoken",
            name="is_persistent",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="usersession",
            name="is_persistent",
            field=models.BooleanField(default=False),
        ),
    ]
