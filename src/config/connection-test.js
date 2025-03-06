const mongoose = require('mongoose');
require('dotenv').config();

// Función para probar la conexión
async function testMongoDBConnection() {
  try {
    // Conexión a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Conexión a MongoDB establecida correctamente');

    // Verificaciones adicionales
    console.log('Detalles de la conexión:');
    console.log('Estado de la conexión:', mongoose.connection.readyState);
    console.log('Host:', mongoose.connection.host);
    console.log('Puerto:', mongoose.connection.port);
    console.log('Nombre de la base de datos:', mongoose.connection.db.databaseName);

    // Opcional: Realizar una operación simple
    const testCollection = mongoose.connection.db.collection('test_connection');
    await testCollection.insertOne({
      message: 'Conexión de prueba',
      timestamp: new Date()
    });

    console.log('✅ Operación de prueba exitosa: Documento insertado');

  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error.message);

    // Diagnóstico de errores común
    if (error.name === 'MongoNetworkError') {
      console.error('Posibles causas:');
      console.error('- Comprueba tu conexión a internet');
      console.error('- Verifica la URL de conexión');
      console.error('- Asegúrate de que la IP está whitelisted en MongoDB Atlas');
    }

  } finally {
    // Cerrar la conexión después de la prueba
    await mongoose.disconnect();
  }
}

// Ejecutar la prueba de conexión
testMongoDBConnection().catch(console.error);