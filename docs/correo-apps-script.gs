/**
 * Relevo de correo para CosplayCraft Hub.
 * Pega este código en https://script.google.com (Nuevo proyecto), con la cuenta
 * de Gmail que enviará los correos. Luego:
 *  1. Configuración del proyecto → Propiedades de la secuencia de comandos →
 *     agrega TOKEN con una clave larga al azar (la misma que APPS_SCRIPT_MAIL_TOKEN en Render).
 *  2. Implementar → Nueva implementación → Aplicación web.
 *     Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
 *  3. Copia la URL que termina en /exec y ponla en APPS_SCRIPT_MAIL_URL en Render.
 */
function doPost(e) {
  var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ ok: false, error: 'json invalido' });
  }
  if (!token || data.token !== token) {
    return respond({ ok: false, error: 'no autorizado' });
  }
  var options = { name: data.name || 'CosplayCraft Hub' };
  if (data.html) options.htmlBody = data.html;
  MailApp.sendEmail(data.to, data.subject, data.body, options);
  return respond({ ok: true });
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ejecuta esta función una vez desde el editor para autorizar el envío de correos
function probar() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Prueba CosplayCraft Hub', 'Funciona.');
}
