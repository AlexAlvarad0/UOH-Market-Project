import os

def delete_migration_files():
    for root, dirs, files in os.walk("."):
        if "migrations" in dirs:
            migration_dir = os.path.join(root, "migrations")
            for file in os.listdir(migration_dir):
                if file != "__init__.py" and file.endswith(".py"):
                    os.remove(os.path.join(migration_dir, file))
                    print(f"Deleted: {os.path.join(migration_dir, file)}")
        for file in files:
            if file.endswith(".pyc"):
                os.remove(os.path.join(root, file))
                print(f"Deleted: {os.path.join(root, file)}")

if __name__ == "__main__":
    delete_migration_files()
