# Generated by Django 5.0.2 on 2025-05-22 03:20

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='EmailVerification',
        ),
    ]
