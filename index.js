import express from 'express'
import cors from 'cors'
import { MongoClient,ObjectId } from 'mongodb';
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
const UpcomminEventsJoinedCollection=db.collection("upcomingEventjoined")


const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization

   if (!authHeader) {
    return res.status(401).send({
       message: 'Unauthorized access'
     });
  // }

  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);

  //   req.user = decoded;
  //   next();
  // } catch (error) {
  //   return res.status(401).send({
  //     message: 'Invalid token'
  //   });
  // }


  next()
};














app.get('/', (req, res) => {
  res.send({message:'Server is runnig' });
});


//data get for all upcoming events

app.get('/upcomingEvent',verifyToken,async (req, res) => {

const result=await UpcomminEventsCollection.find().sort({ date: 1 }).toArray()

  res.send(result);
});


//post for create event
app.post('/upcomingEvent',async (req, res) => {
try {
    const eventData = req.body;

    console.log("Backend Received Data:", eventData);

    const result = await UpcomminEventsCollection.insertOne(eventData);

    console.log("Inserted ID:", result.insertedId);

    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
})

app.get('/upcomingEvent/:id',async(req,res)=>{

const id=req.params.id

  const result = await UpcomminEventsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);


})
app.post("/upcomingEvent/joined", async (req, res) => {
  try {
    const { userEmail, ...eventData } = req.body;

    const joinedData = {
      ...eventData,
      eventId: eventData.eventId || eventData._id,
      userEmail,
      joinedAt: new Date(),
    };

    delete joinedData._id;

    const result = await UpcomminEventsJoinedCollection.insertOne(joinedData);

    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Failed to join event" });
  }
});

app.get("/joined-events/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const result = await UpcomminEventsJoinedCollection
      .find({ userEmail: email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});

app.get('/manage-events/:email',async(req,res)=>{

  const email=req.params.email
  const result= await UpcomminEventsCollection.find({userEmail:email}).toArray()

res.send(result)

})

app.get("/recentupcomingEvent", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const events = await UpcomminEventsCollection.find({ date: { $gte: today } }).sort({ date: 1 })
      .limit(6)
      .toArray();
console.log("Events found:", events.length);
    res.send(events);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch events" });
  }
});



app.patch("/upcomingEvent/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await UpcomminEventsCollection.updateOne(
    { _id: new ObjectId(id) }, 
    { $set: updatedData }, 
  );
  res.send(result);
});

app.delete("/upcomingEvent/:id", async (req, res) => {
  const id = req.params.id;
  const result = await UpcomminEventsCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})}