const express = require('express')
const cors=require('cors')
const app = express()
require('dotenv').config();
const port =process.env.PORT|| 3000

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);
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
const blogsCollection = db.collection("blogs");
const fundsCollection = db.collection("funding")


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



// PATCH /users/:id - Update user status or role
app.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: 'User not found or no changes made.' });
    }

    res.send({ message: 'User updated successfully', result });
  } catch (error) {
    res.status(500).send({ error: 'Failed to update user.' });
  }
});

//admin dashboard


// Get total users
app.get('/stats/users', async (req, res) => {
  const count = await usersCollection.countDocuments();
  res.send({ totalUsers: count });
});

// Get total blood donation requests
app.get('/stats/donation-requests', async (req, res) => {
  const count = await donationRequestCollection.countDocuments();
  res.send({ totalRequests: count });
});

//  Get total funding amount
app.get('/stats/funding', async (req, res) => {
  const fundingCollection = db.collection("funding"); // If you have a funding collection
  const all = await fundingCollection.find({}).toArray();
  const total = all.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  res.send({ totalFunding: total });
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



//blog added


// Get all blogs
app.get('/blogs', async (req, res) => {
  try {
    const status = req.query.status;
    let query = {};
    
    if (status === 'published') {
      query.status = 'published';
    }

    const blogs = await blogsCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(blogs);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch blogs' });
  }
});


app.get('/blogs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });
    res.send(blog);
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch blog' });
  }
});


app.post('/blogs', async (req, res) => {
  try {
    const blog = req.body;
    const result = await blogsCollection.insertOne(blog);
    res.send({ message: 'Blog added', insertedId: result.insertedId });
  } catch (error) {
    res.status(500).send({ error: 'Failed to save blog' });
  }
});


// PATCH - Update blog status
app.patch('/blogs/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const result = await blogsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    res.send({ message: "Blog updated", result });
  } catch (err) {
    res.status(500).send({ error: 'Failed to update blog' });
  }
});

// DELETE - Delete blog
app.delete('/blogs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await blogsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ message: "Blog deleted", result });
  } catch (err) {
    res.status(500).send({ error: 'Failed to delete blog' });
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









//Funding

app.get('/funds', async (req, res) => { 
  try {
    const funds = await fundsCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(funds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/save-fund', async (req, res) => {
  try {
    const { userId, name, amount } = req.body;
    const newFund = {
      userId,
      name,
      amount,
      createdAt: new Date(),
    };
    const result = await fundsCollection.insertOne(newFund);
    res.json({ success: true, fundId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/create-payment', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount,  // amount in cents
      currency: 'usd',
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
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