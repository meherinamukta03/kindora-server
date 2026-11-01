import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb';
import 'dotenv/config'


const app = express();
const PORT = 5000;

app.use(cors())
app.use(express.json())



const client = new MongoClient(process.env.MONGO_DB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const collectionClient=await connectToMongoDB()
const db=collectionClient.db("kindora")
const UpcomminEventsCollection=db.collection("upcomingEvent")


app.get('/', (req, res) => {
  res.send({message:'Server is runnig' });
});


//data get for all upcoming events

app.get('/upcomingEvent',async (req, res) => {

const result=await UpcomminEventsCollection.find().toArray()

  res.send(result);
});


//post for create event
app.post('/upcomingEvent',async (req, res) => {

  const eventData= req.body

const result =await UpcomminEventsCollection.insertOne(eventData)
res.sendStatus(result)
})




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});