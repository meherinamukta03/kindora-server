import express from 'express'
import cors from 'cors'
import { MongoClient,ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from 'jose';


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


const verifyToken = async(req, res, next) => {
  const authHeader = req.headers.authorization
console.log(authHeader)
   if (!authHeader) {
    return res.status(401).send({
       message: 'Unauthorized access'
     });}




const token =authHeader.split(" ")[1]


console.log(token)

if(!token){
return res.status(401).send({
       message: 'Unauthorized access'
     })


}


const JWKS=createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

// Invalid/expired/forge token hole jwtVerify throw kore — catch na dile server crash kore 500 dey
try {
  const {payload}=await jwtVerify(token,JWKS)
  console.log(payload)
} catch (error) {
  console.log("JWT verification failed:", error?.message)
  return res.status(401).send({
    message: 'Unauthorized access — invalid or expired token'
  })
}

  next()

}















app.get('/', (req, res) => {
  res.send({message:'Server is runnig' });
});


//data get for all upcoming events

app.get('/upcomingEvent',async (req, res) => {

const result=await UpcomminEventsCollection.find().sort({ date: 1 }).toArray()

  res.send(result);
});


//post for create event
app.post('/upcomingEvent',verifyToken,async (req, res) => {
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

app.get('/upcomingEvent/:id',verifyToken,async(req,res)=>{

const id=req.params.id

  const result = await UpcomminEventsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);


})
app.post("/upcomingEvent/joined",verifyToken, async (req, res) => {
  try {
    const { userEmail, ...eventData } = req.body;

    // userEmail chhara join record save hobe na — ageki bug er cause chhilo
    if (!userEmail) {
      return res.status(400).send({ message: "userEmail is required. Please login first." });
    }

    const eventId = eventData.eventId || eventData._id;
    if (!eventId) {
      return res.status(400).send({ message: "eventId is required" });
    }

    // Same user same event e second time join korte parbe na
    const existing = await UpcomminEventsJoinedCollection.findOne({ eventId, userEmail });
    if (existing) {
      return res.status(409).send({ message: "You have already joined this event" });
    }

    const joinedData = {
      ...eventData,
      eventId,
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

// Leave Event — joined record delete
app.delete("/upcomingEvent/joined",verifyToken, async (req, res) => {
  try {
    const { userEmail, eventId } = req.query;

    if (!userEmail || !eventId) {
      return res.status(400).send({ message: "userEmail and eventId are required" });
    }

    const result = await UpcomminEventsJoinedCollection.deleteOne({ userEmail, eventId });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "You have not joined this event" });
    }

    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Failed to leave event" });
  }
});

app.get("/joined-events/:email",verifyToken, async (req, res) => {
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

app.get('/manage-events/:email',verifyToken,async(req,res)=>{

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



app.patch("/upcomingEvent/:id",verifyToken, async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await UpcomminEventsCollection.updateOne(
    { _id: new ObjectId(id) }, 
    { $set: updatedData }, 
  );
  res.send(result);
});

app.delete("/upcomingEvent/:id", verifyToken,async (req, res) => {
  const id = req.params.id;
  const result = await UpcomminEventsCollection.deleteOne({
    _id: new ObjectId(id),
  });
  res.send(result);
});




// Find events by city
app.get("/events-by-location/:city", async (req, res) => {
  try {
    const city = req.params.city;

    if (!city) {
      return res.status(400).send({
        message: "City is required",
      });
    }

    const events = await UpcomminEventsCollection
      .find({
        location: {
          $regex: `^${city}$`,
          $options: "i",
        },
      })
      .toArray();

    res.status(200).send(events);
  } catch (error) {
    console.error("Location search error:", error);

    res.status(500).send({
      message: "Failed to find events",
    });
  }
});














app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})

export default app 