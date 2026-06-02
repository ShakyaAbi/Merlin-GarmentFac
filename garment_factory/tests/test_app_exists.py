import unittest


class TestAppExistence(unittest.TestCase):
    def test_app_import(self):
        import garment_factory
        self.assertTrue(hasattr(garment_factory, 'hooks'))


if __name__ == '__main__':
    unittest.main()
