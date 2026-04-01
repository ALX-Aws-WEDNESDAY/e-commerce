# import the function to test
import sys
import os

# ensure project root is on sys.path so `code` package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from calc_pkg.calc import add


def test_add():
    assert add(2, 3) == 5
