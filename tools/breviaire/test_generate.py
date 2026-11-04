import pathlib, sys, unittest
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import generate as g

SAMPLE = (pathlib.Path(__file__).parent / "fixtures" / "exemple.html").read_text(encoding="utf-8")

class ParseTest(unittest.TestCase):
    def setUp(self):
        self.o = g.parse_office(SAMPLE)

    def test_titre(self):
        self.assertEqual(self.o["titre"], "S. Caroli Episcopi et Confessoris ~ III. classis")
        self.assertTrue(self.o["sous"].startswith("Tempora:"))

    def test_lignes_appariees(self):
        self.assertEqual(len(self.o["lignes"]), 3)
        self.assertEqual(g.plain(self.o["lignes"][2][1]), "Ainsi soit-il.")

    def test_nettoyage(self):
        la, fr = self.o["lignes"][0]
        self.assertNotIn("Top", la)
        self.assertNotIn("Laudes", la)
        self.assertIn('<span class="do-titre">', la)
        self.assertIn('&amp; meum', la)
        self.assertNotIn("alert", fr)
        self.assertNotIn("href", fr)
        self.assertNotIn("script", fr)
        self.assertEqual(la.count("<span"), la.count("</span>"))

    def test_controles(self):
        self.assertEqual(g.check_office(self.o), [])
        self.assertEqual(g.latin_only(self.o), 1)
        self.assertTrue(g.check_office({"titre": "", "lignes": []}))

if __name__ == "__main__":
    unittest.main()
