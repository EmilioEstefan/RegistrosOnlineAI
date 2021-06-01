const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');
const Path = require('path')  
const { MessageMedia } = require('whatsapp-web.js');
const mime = require('mime')
//Renovar el servicio cada 5 minutos
var hoy = new Date();
var Minutos = hoy.getMinutes()
var renovar = hoy.getMinutes() + 5
var hoy = new Date();

//Watson ApiKey & URL to
const apiKeyWatson = 'Vqo1rnu49mp70NUXm91_SNSkJbgju3Vpa4oTPWF6t3qv';
const serviceUrl = 'https://api.us-south.assistant.watson.cloud.ibm.com/instances/3140bed8-58f3-49cd-bb0a-1ec2f949f000'
var assistantId = '6a4f7522-6d7c-471a-8a80-6d72fab5e9a1'
var sessionId 
var Whatsomresult;

var MensajeTexto 



// Lugar donde se guarda la sesion de whatsapp
const SESSION_FILE_PATH = './session.json';

// Cargar los datos si existen
let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

  
// Usar los datos guardados
const client = new Client({
    session: sessionData
});

// Guardar los datos
client.on('authenticated', (session) => {
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});






client.on('qr', (qr) => {
    // Generar codigo QR
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, {small: true});

});

client.on('ready', () => {
    console.log('Client is ready!');
   
});



client.initialize();

//Definir mensaje
client.on('message', message => {
	console.log(message.body);
});
//Autenticar el whatsapp
client.on('authenticated', (session) => {
    //Verificar la session
    console.log('AUTHENTICATED', session);
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});



//FUNCION DE MENSAJES ASINCRONOS (Llamada a la api Whatson)
client.on('message', async msg => {
  const chat = await msg.getChat();
  //excecutejpg es una funcion para descargar imagenes de una base NoSQL
  function excecutejpg( ){
  
    fs.readFile(
      "./images/code.jpg",
      {
          encoding: "base64",
      },
      function (err, data) {
          var media2 = new MessageMedia("image/jpg", data);
          return chat.sendMessage(media2);

          console.log("erroraqui"+err)
      }
  );
  }
    //Si la respuesta del cliente tiene imagenes se descargaran y se subiran a la base NoSQL
    if(msg.hasMedia) {
      
        const median = await msg.downloadMedia();
        // do something with the media data here
    }else {

        //Se genera un asistente
        const assistant = new AssistantV2({
          
          version: '2020-04-01',
          authenticator: new IamAuthenticator({
            apikey: apiKeyWatson,
          }),
          serviceUrl: serviceUrl,
        });
        //Se genera una sesion del cliente Whatson
        assistant.createSession({
          assistantId: assistantId
        }) 
         .then(res => {
          //console.log(JSON.stringify(res.result, null, 2));
          sessionId = res.result.session_id;
          //console.log(sessionId)
          MensajeTexto= msg.body
          //Se manda un JSON  
          assistant.message({
            assistantId: assistantId,
            sessionId: sessionId,
            input: {
              'message_type': 'text',
              'text': MensajeTexto
              }
            })
            .then(res => {
              //En caso de tener multimedia se ejecuta la funcion excecutejpg para llamar a la base NoSQL
              
              if(res.result.output.generic[0].response_type == "image"){
                downloadImage(res.result.output.generic[0].url)
                excecutejpg()
                                                                                               
              }
              //Manda un mensaje con lo que responda el asistente ya entrenado
              else{
                Whatsomresult = res.result.output.generic[0].text
                msg.reply( Whatsomresult );}
              
            })
            .catch(err => {
              console.log(err);
            })
        })
        .catch(err => {
          console.log(err);
        });
    }

    
});
 
//Descargar multimedia de la base NoSQL
async function downloadImage () {  
  const url = 'https://boletos.s3.ap.cloud-object-storage.appdomain.cloud/BOLETO1BOLETO.jpg'
  const path = Path.resolve(__dirname, 'images', 'code.jpg')
  const writer = fs.createWriteStream(path)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}