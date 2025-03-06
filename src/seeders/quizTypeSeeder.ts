// const MongoDBConnection = require('../config/mongodb-connection');
import MongoDBConnection from '../config/mongodb-connection';
// const quizTypesData = require('../constants/quizType');
import { quizTypesData } from '../constants/quizType';

// Función para sembrar datos
async function seedQuizTypes() {
  let client;
  try {
    // Conectar a la base de datos
    client = await MongoDBConnection.connect();

    // Obtener la base de datos
    const db = MongoDBConnection.getDatabase('quiz-app');

    // Obtener la colección
    const quizTypeCollection = db.collection('quizTypes');

    // Limpiar la colección existente
    await quizTypeCollection.deleteMany({});

    // Insertar nuevos tipos de quiz
    const result = await quizTypeCollection.insertMany(quizTypesData);

    console.log('Tipos de Quiz insertados exitosamente:');
    console.log(`${result.insertedCount} documentos insertados`);

    quizTypesData.forEach((type, index) => {
      console.log(`- ${type.name} (${type.type})`);
    });
  } catch (error) {
    console.error('Error sembrando tipos de Quiz:', error);
  } finally {
    // Desconectar si el cliente está conectado
    if (client) {
      await MongoDBConnection.disconnect();
    }
  }
}

// Exportar para uso directo o como módulo
module.exports = seedQuizTypes;

// Si se ejecuta directamente
if (require.main === module) {
  seedQuizTypes();
}
