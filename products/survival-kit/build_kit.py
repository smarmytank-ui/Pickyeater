"""Local launcher; paid authoring content stays under private Pages Functions."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).resolve().parents[2] / "functions" / "_shared" / "build_survival_kit.py"), run_name="__main__")
