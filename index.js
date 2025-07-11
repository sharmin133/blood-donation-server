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

app.get('/users', async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch users' });
  }
});


// app.get('/users/email/:email', async (req, res) => {
//   const email = req.params.email;
//   const user = await usersCollection.findOne({ email });
//   res.send(user);
// });



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