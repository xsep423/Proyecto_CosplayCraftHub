"""
Pruebas de imágenes, portafolio público y documento de cotización.

    python manage.py test apps.gallery
"""
import io
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from apps.inventory.models import Material
from apps.projects.models import Project, ProjectPhoto
from apps.quotes.models import Quote
from apps.users.models import Workshop

from apps.gallery import storage
from apps.gallery.models import StoredImage


def make_image(size=(2400, 1800), fmt='JPEG', color=(200, 40, 90), exif=None, mode='RGB'):
    img = Image.new(mode, size, color)
    buf = io.BytesIO()
    kwargs = {'exif': exif} if exif is not None else {}
    img.save(buf, format=fmt, **kwargs)
    ext = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}[fmt]
    return SimpleUploadedFile(f'foto.{ext}', buf.getvalue(), content_type=f'image/{ext}')


def gps_exif():
    exif = Image.Exif()
    exif[0x010F] = 'TelefonoX'                     # Make
    exif[0x8825] = {1: 'N', 2: (19.0, 26.0, 0.0)}  # GPSInfo
    exif[0x0112] = 6                               # Orientation: rotar 90°
    return exif


class ProcessUploadTests(APITestCase):
    def test_redimensiona_convierte_a_webp_y_crea_miniatura(self):
        full, thumb, w, h = storage.process_upload(make_image())
        self.assertEqual(max(w, h), storage.MAX_SIDE)
        self.assertEqual(Image.open(io.BytesIO(full)).format, 'WEBP')
        self.assertLessEqual(max(Image.open(io.BytesIO(thumb)).size), storage.THUMB_SIDE)

    def test_quita_exif_y_aplica_rotacion(self):
        full, _, w, h = storage.process_upload(make_image(size=(800, 400), exif=gps_exif()))
        # La orientación 6 gira la foto: ahora es vertical
        self.assertEqual((w, h), (400, 800))
        out = Image.open(io.BytesIO(full))
        self.assertEqual(len(out.getexif()), 0)
        self.assertNotIn(b'TelefonoX', full)

    def test_conserva_transparencia(self):
        full, _, _, _ = storage.process_upload(make_image(size=(300, 300), fmt='PNG', mode='RGBA', color=(0, 0, 0, 0)))
        self.assertEqual(Image.open(io.BytesIO(full)).mode, 'RGBA')

    def test_rechaza_archivos_que_no_son_imagen(self):
        fake = SimpleUploadedFile('virus.jpg', b'no soy una imagen', content_type='image/jpeg')
        with self.assertRaises(storage.ValidationError):
            storage.process_upload(fake)

    def test_rechaza_archivos_grandes(self):
        big = make_image(size=(10, 10))
        big.size = storage.MAX_UPLOAD_BYTES + 1
        with self.assertRaises(storage.ValidationError):
            storage.process_upload(big)


class BaseApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', stdout=open('/dev/null', 'w'))
        cls.forja = Workshop.objects.get(slug='forja-cosplay')
        cls.hilo = Workshop.objects.get(slug='hilo-espuma')
        cls.admin = User.objects.get(email='admin@forja.demo')
        cls.maker = User.objects.get(email='maker@forja.demo')
        cls.viewer = User.objects.get(email='viewer@forja.demo')
        cls.project = Project.objects.filter(workshop=cls.forja).first()
        cls.foreign_project = Project.objects.filter(workshop=cls.hilo).first()

    def setUp(self):
        cache.clear()  # el límite de peticiones anónimas no debe pasar de un test a otro

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def upload_photo(self, project=None, **extra):
        data = {'projectId': (project or self.project).pk, 'file': make_image(), **extra}
        return self.client.post('/api/projects/photos/', data, format='multipart')


class ProjectPhotoTests(BaseApiTests):
    def test_maker_sube_foto_y_se_sirve_desde_la_base(self):
        self.as_user(self.maker)
        res = self.upload_photo(caption='Casco', stage='progress')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['caption'], 'Casco')
        self.assertTrue(res.data['image']['url'].startswith('/api/media/'))

        self.client.force_authenticate(user=None)  # las imágenes no requieren sesión
        img = self.client.get(res.data['image']['url'])
        self.assertEqual(img.status_code, 200)
        self.assertEqual(img['Content-Type'], 'image/webp')
        self.assertIn('immutable', img['Cache-Control'])
        thumb = self.client.get(res.data['image']['thumbUrl'])
        self.assertEqual(thumb.status_code, 200)
        self.assertLess(len(thumb.content), len(img.content))

    def test_viewer_no_puede_subir(self):
        self.as_user(self.viewer)
        self.assertEqual(self.upload_photo().status_code, 403)

    def test_no_se_sube_a_proyecto_de_otro_taller(self):
        self.as_user(self.admin)
        res = self.upload_photo(project=self.foreign_project)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(StoredImage.objects.count(), 0)

    def test_fotos_de_otro_taller_no_se_ven(self):
        self.as_user(User.objects.get(email='admin@hiloespuma.demo'))
        photo_id = self.upload_photo(project=self.foreign_project).data['id']
        self.as_user(self.admin)
        self.assertEqual(self.client.get(f'/api/projects/photos/{photo_id}/').status_code, 404)
        self.assertEqual(self.client.get('/api/projects/photos/').data, [])

    def test_archivo_invalido_da_400(self):
        self.as_user(self.maker)
        bad = SimpleUploadedFile('x.jpg', b'nada', content_type='image/jpeg')
        res = self.client.post('/api/projects/photos/', {'projectId': self.project.pk, 'file': bad}, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertIn('file', res.data)

    def test_solo_una_portada_y_aparece_en_el_proyecto(self):
        self.as_user(self.maker)
        a = self.upload_photo(isCover='true').data
        b = self.upload_photo().data
        res = self.client.patch(f"/api/projects/photos/{b['id']}/", {'isCover': True}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(ProjectPhoto.objects.filter(project=self.project, is_cover=True).count(), 1)
        self.assertFalse(ProjectPhoto.objects.get(pk=a['id']).is_cover)

        project = self.client.get(f'/api/projects/{self.project.pk}/').data
        self.assertEqual(project['cover']['id'], b['image']['id'])
        self.assertEqual(project['photoCount'], 2)
        listed = next(p for p in self.client.get('/api/projects/').data if p['id'] == self.project.pk)
        self.assertEqual(listed['cover']['id'], b['image']['id'])

    def test_borrar_foto_borra_la_imagen(self):
        self.as_user(self.maker)
        photo = self.upload_photo().data
        self.assertEqual(self.client.delete(f"/api/projects/photos/{photo['id']}/").status_code, 204)
        self.assertFalse(StoredImage.objects.filter(pk=photo['image']['id']).exists())
        self.assertEqual(self.client.get(photo['image']['url']).status_code, 404)

    def test_borrar_proyecto_borra_sus_imagenes(self):
        self.as_user(self.admin)
        image_id = self.upload_photo().data['image']['id']
        Quote.objects.filter(project=self.project).update(project=None)
        self.assertEqual(self.client.delete(f'/api/projects/{self.project.pk}/').status_code, 204)
        self.assertFalse(StoredImage.objects.filter(pk=image_id).exists())

    def test_limite_de_fotos_por_proyecto(self):
        self.as_user(self.maker)
        with mock.patch.object(ProjectPhoto, 'MAX_PER_PROJECT', 1):
            self.assertEqual(self.upload_photo().status_code, 201)
            self.assertEqual(self.upload_photo().status_code, 400)


class MaterialImageTests(BaseApiTests):
    def test_maker_pone_cambia_y_quita_foto(self):
        material = Material.objects.filter(workshop=self.forja).first()
        url = f'/api/inventory/materials/{material.pk}/image/'
        self.as_user(self.maker)

        first = self.client.post(url, {'file': make_image()}, format='multipart')
        self.assertEqual(first.status_code, 200, first.data)
        first_id = first.data['image']['id']

        second = self.client.post(url, {'file': make_image(color=(1, 2, 3))}, format='multipart')
        self.assertNotEqual(second.data['image']['id'], first_id)
        self.assertFalse(StoredImage.objects.filter(pk=first_id).exists())  # la anterior se borra

        listed = self.client.get('/api/inventory/materials/').data
        self.assertEqual(next(m for m in listed if m['id'] == material.pk)['image']['id'], second.data['image']['id'])

        removed = self.client.delete(url)
        self.assertEqual(removed.status_code, 200)
        self.assertIsNone(removed.data['image'])
        self.assertEqual(StoredImage.objects.count(), 0)

    def test_viewer_no_cambia_fotos(self):
        material = Material.objects.filter(workshop=self.forja).first()
        self.as_user(self.viewer)
        res = self.client.post(f'/api/inventory/materials/{material.pk}/image/', {'file': make_image()}, format='multipart')
        self.assertEqual(res.status_code, 403)

    def test_ajuste_de_stock_sigue_funcionando_con_foto(self):
        material = Material.objects.filter(workshop=self.forja).first()
        self.as_user(self.maker)
        self.client.post(f'/api/inventory/materials/{material.pk}/image/', {'file': make_image()}, format='multipart')
        res = self.client.post(f'/api/inventory/materials/{material.pk}/adjust/', {'delta': 1}, format='json')
        self.assertEqual(res.status_code, 200, res.data)

    def test_borrar_material_borra_su_foto(self):
        material = Material.objects.create(workshop=self.forja, name='Temporal', category='Tela', unit='m')
        self.as_user(self.admin)
        self.client.post(f'/api/inventory/materials/{material.pk}/image/', {'file': make_image()}, format='multipart')
        self.assertEqual(StoredImage.objects.count(), 1)
        self.assertEqual(self.client.delete(f'/api/inventory/materials/{material.pk}/').status_code, 204)
        self.assertEqual(StoredImage.objects.count(), 0)


class WorkshopLogoTests(BaseApiTests):
    def test_admin_sube_logo_y_sale_en_el_login(self):
        self.as_user(self.admin)
        res = self.client.post('/api/auth/workshop/logo/', {'file': make_image(fmt='PNG')}, format='multipart')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNotNone(res.data['logo'])

        self.client.force_authenticate(user=None)
        login = self.client.post('/api/auth/login/', {'email': 'admin@forja.demo', 'password': 'Demo1234!'}, format='json')
        self.assertEqual(login.data['workshop']['logo']['id'], res.data['logo']['id'])

    def test_maker_no_cambia_el_logo(self):
        self.as_user(self.maker)
        res = self.client.post('/api/auth/workshop/logo/', {'file': make_image()}, format='multipart')
        self.assertEqual(res.status_code, 403)


class PublicPortfolioTests(BaseApiTests):
    def setUp(self):
        super().setUp()
        self.as_user(self.maker)
        self.upload_photo(stage='final', caption='Listo')
        self.upload_photo(stage='reference', caption='Arte de otra persona')
        self.client.force_authenticate(user=None)

    def test_apagado_da_404(self):
        self.assertEqual(self.client.get('/api/public/forja-cosplay/').status_code, 404)

    def test_solo_proyectos_publicos_y_sin_datos_internos(self):
        Workshop.objects.filter(pk=self.forja.pk).update(portfolio_enabled=True)
        Project.objects.filter(pk=self.project.pk).update(is_public=True)
        # Un token inválido no debe impedir ver una página pública
        self.client.credentials(HTTP_AUTHORIZATION='Bearer basura')
        res = self.client.get('/api/public/forja-cosplay/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([p['id'] for p in res.data['projects']], [self.project.pk])

        item = res.data['projects'][0]
        for secret in ('budget', 'clientName', 'clientId', 'spent', 'laborCost', 'responsible'):
            self.assertNotIn(secret, item)
        self.assertEqual([ph['caption'] for ph in item['photos']], ['Listo'])  # sin referencias
        self.assertIsNotNone(item['cover'])

    def test_taller_desactivado_da_404(self):
        Workshop.objects.filter(pk=self.forja.pk).update(portfolio_enabled=True, is_active=False)
        self.assertEqual(self.client.get('/api/public/forja-cosplay/').status_code, 404)

    def test_admin_activa_portafolio_y_maker_marca_proyecto(self):
        self.as_user(self.admin)
        res = self.client.patch('/api/auth/workshop/', {'portfolioEnabled': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['portfolioEnabled'])
        self.assertEqual(res.data['slug'], 'forja-cosplay')
        self.as_user(self.maker)
        res = self.client.patch(f'/api/projects/{self.project.pk}/', {'isPublic': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['isPublic'])


class QuoteDocumentTests(BaseApiTests):
    def test_documento_trae_taller_y_cliente(self):
        quote = Quote.objects.filter(workshop=self.forja).first()
        self.as_user(self.viewer)
        res = self.client.get(f'/api/quotes/{quote.pk}/document/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['quote']['number'], quote.number)
        self.assertEqual(res.data['workshop']['name'], self.forja.name)
        self.assertEqual(res.data['client']['email'], quote.client.correo)

    def test_documento_de_otro_taller_da_404(self):
        quote = Quote.objects.filter(workshop=self.hilo).first()
        self.as_user(self.admin)
        self.assertEqual(self.client.get(f'/api/quotes/{quote.pk}/document/').status_code, 404)


@override_settings(IMAGE_STORAGE='cloudinary', CLOUDINARY_URL='cloudinary://key:secret@demo-cloud')
class CloudinaryBackendTests(BaseApiTests):
    def setUp(self):
        super().setUp()
        storage._cloudinary_ready = False

    def tearDown(self):
        storage._cloudinary_ready = False

    @mock.patch('cloudinary.uploader.destroy')
    @mock.patch('cloudinary.uploader.upload')
    def test_sube_a_cloudinary_y_borra_al_eliminar(self, upload, destroy):
        upload.return_value = {
            'public_id': 'cosplaycrafthub/forja-cosplay/proyectos/1/abc',
            'secure_url': 'https://res.cloudinary.com/demo-cloud/image/upload/v1/cosplaycrafthub/abc.webp',
        }
        self.as_user(self.maker)
        res = self.upload_photo()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['image']['url'], upload.return_value['secure_url'])
        self.assertIn('/image/upload/c_limit,w_480,h_480/', res.data['image']['thumbUrl'])

        image = StoredImage.objects.get(pk=res.data['image']['id'])
        self.assertEqual(image.backend, 'cloudinary')
        self.assertIsNone(image.data)  # los bytes no se guardan en la base

        # La ruta de la API redirige a Cloudinary
        redirect = self.client.get(f'/api/media/{image.pk}/')
        self.assertEqual(redirect.status_code, 302)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.delete(f"/api/projects/photos/{res.data['id']}/")
        destroy.assert_called_once()
        self.assertEqual(destroy.call_args.args[0], upload.return_value['public_id'])

    @mock.patch('cloudinary.uploader.upload', side_effect=RuntimeError('caído'))
    def test_error_de_cloudinary_da_400_sin_registro(self, upload):
        self.as_user(self.maker)
        res = self.upload_photo()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(StoredImage.objects.count(), 0)
