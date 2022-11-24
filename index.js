const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const mongoUser = process.env.USER_NAME
const mongoPass = process.env.USER_PASS;
const accessToken = process.env.ACCESS_TOKEN;

const uri = `mongodb+srv://${mongoUser}:${mongoPass}@cluster0.cjfgfqu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const userCollection = client.db('used').collection('users');

        // create jwt (JSON web token )
        app.post('/used-jwt', (req, res) => {
            const user = req.body;
            const createToken = jwt.sign({ uid: user?.uid }, accessToken);
            res.send({ token: createToken });
        });

        // create user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { uid: user?.uid }
            const findUser = await userCollection.findOne(query);
            if (findUser) {
                return res.send(findUser);
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

    } finally {

    }
}

run().catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send('Used Server is running');
});

app.listen(port, () => console.log(`Used Server running post on ${port}`))