const express = require('express')
const cors=require('cors')
const app = express()
require('dotenv').config();
const port =process.env.PORT|| 3000

app.use(cors())
app.use(express.json())
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1ipyx2m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    await client.connect();
const db = client.db("redHopeDB");
const usersCollection = db.collection("users");
const donationRequestCollection = db.collection("donationRequests");



app.get('/users', async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch users' });
  }
});


app.get('/users/email/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch user' });
  }
});



app.post('/users', async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.status(409).send({ message: 'User already exists' });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  delete updatedData.email; 

  try {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to update user profile' });
  }
});



//donar all operation 

app.get('/donation-requests', async (req, res) => {
  try {
    const donationRequests = await donationRequestCollection.find({}).toArray();
    res.send(donationRequests);
  } catch (error) {
    console.error('Failed to fetch donation requests:', error);
    res.status(500).send({ error: 'Failed to fetch donation requests' });
  }
});


app.post('/donation-requests', async (req, res) => {
  try {
    const donationRequest = req.body;

    // 1. Check if requester email exists in users collection and is active
    const user = await usersCollection.findOne({ email: donationRequest.requesterEmail });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    if (user.status !== 'active') {
      return res.status(403).send({ error: "Blocked users cannot create donation requests" });
    }

    // 2. Add createdAt timestamp and default status 'pending'
    donationRequest.createdAt = new Date();
    donationRequest.status = 'pending';  // Ensure status is set to pending by default

    // 3. Insert donation request
    const result = await donationRequestCollection.insertOne(donationRequest);

    res.status(201).send({ insertedId: result.insertedId, message: "Donation request created" });

  } catch (error) {
    console.error("Error creating donation request:", error);
    res.status(500).send({ error: "Failed to create donation request" });
  }
});



// Get all donation requests made by a user (by requester email)
app.get('/donation-requests/requester/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await donationRequestCollection
      .find({ requesterEmail: email })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch donation requests' });
  }
});


//view donar all request




// Get a single donation request by ID
app.get('/donation-requests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const request = await donationRequestCollection.findOne({ _id: new ObjectId(id) });
    res.send(request);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch donation request' });
  }
});


// Keep only PATCH for all update operations
app.patch('/donation-requests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    const result = await donationRequestCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to update donation request.' });
  }
});


  } finally {
   
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('welcome to RedHope')

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})