/**
 * Script para probar conexiones WebSocket directamente
 * Para ejecutar: 
 * 1. Asegúrate de tener Node.js instalado
 * 2. Ejecuta: node websocket_test.js
 */
const WebSocket = require('ws');

// CONFIG: Ajusta estos valores según tu entorno
const token = "022a5a1367bcd1070e5d182cad41e0e8cb1a53be"; // Token de autenticación
const conversationId = "6"; // ID de la conversación a probar

// URLs de prueba
const urls = {
  chat: `ws://127.0.0.1:8000/ws/chat/${conversationId}/?token=${token}`,
  notifications: `ws://127.0.0.1:8000/ws/notifications/?token=${token}`,
  // Variantes alternativas para probar diferentes formatos
  chatAlt: `ws://127.0.0.1:8000/ws/chat/${conversationId}?token=${token}`, // Sin slash final
  notificationsAlt: `ws://127.0.0.1:8000/ws/notifications?token=${token}` // Sin slash final
};

console.log("=== TEST DE CONEXIONES WEBSOCKET ===");

// Función para probar una conexión WebSocket
function testConnection(name, url) {
  console.log(`\nProbando conexión a ${name}: ${url}`);
  
  const socket = new WebSocket(url);
  
  socket.on('open', () => {
    console.log(`✅ Conexión exitosa a ${name}`);
    
    // Enviar un mensaje de prueba
    if (name.includes('chat')) {
      const message = {
        type: 'chat_message',
        content: 'Mensaje de prueba desde websocket_test.js',
        message_type: 'text'
      };
      socket.send(JSON.stringify(message));
      console.log('📤 Mensaje enviado:', message);
    }
  });
  
  socket.on('message', (data) => {
    console.log(`📩 Mensaje recibido de ${name}:`, data.toString());
    try {
      const jsonData = JSON.parse(data);
      console.log('Datos parseados:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('No se pudo parsear como JSON');
    }
  });
  
  socket.on('error', (error) => {
    console.log(`❌ Error en conexión ${name}:`, error.message);
  });
  
  socket.on('close', (code, reason) => {
    console.log(`🔌 Conexión cerrada a ${name}. Código:`, code, 'Razón:', reason.toString());
  });
  
  // Cerrar la conexión después de 10 segundos
  setTimeout(() => {
    if (socket.readyState === WebSocket.OPEN) {
      console.log(`Cerrando conexión a ${name}...`);
      socket.close();
    }
  }, 10000);
  
  return socket;
}

// Probar todas las URLs
const chatSocket = testConnection('chat', urls.chat);
const notificationsSocket = testConnection('notifications', urls.notifications);

// Esperar un poco y probar las URLs alternativas
setTimeout(() => {
  const chatSocketAlt = testConnection('chat (alt)', urls.chatAlt);
  const notificationsSocketAlt = testConnection('notifications (alt)', urls.notificationsAlt);
}, 5000);

// Mantener el proceso activo
setTimeout(() => {
  console.log("\n=== PRUEBA COMPLETADA ===");
  process.exit(0);
}, 30000);
