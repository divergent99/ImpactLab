import unittest
from backend.app.impact_engine import analyze_impact

class ImpactEngineTests(unittest.TestCase):
    def test_depth_two_reaches_transitive_work(self):
        keys = {issue.key for issue in analyze_impact("SCRUM-2", depth=2).nodes}
        self.assertIn("SCRUM-7", keys)
        self.assertIn("SCRUM-5", keys)

    def test_depth_one_stays_direct(self):
        keys = {issue.key for issue in analyze_impact("scrum-2", depth=1).nodes}
        self.assertNotIn("SCRUM-7", keys)
        self.assertNotIn("SCRUM-5", keys)

if __name__ == "__main__":
    unittest.main()
