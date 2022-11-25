const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const mongoUser = process.env.USER_NAME
const mongoPass = process.env.USER_PASS;
const secretToken = process.env.ACCESS_TOKEN;

const uri = `mongodb+srv://${mongoUser}:${mongoPass}@cluster0.cjfgfqu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const accessToken = req.headers?.authorization;
    const splitToken = accessToken.split(' ')[1];
    jwt.verify(splitToken, secretToken, function (err, decoded) {
        if (!err) {
            req.decoded = decoded;
            next();
        } else {
            return res.status(403).send({ message: 'unauthorized' });
        }
    });
}

async function run() {
    try {

        const userCollection = client.db('used').collection('users');
        const categoryCollection = client.db('used').collection('category');
        const productsCollection = client.db('used').collection('products');

        async function verifyAdmin(req, res, next) {
            const id = req.decoded?.uid;
            const query = { uid: id };
            const result = await userCollection.findOne(query);
            if (result && result?.role !== 'Admin') {
                return res.status(403).send({ message: 'unauthorized' });
            }
            next();
        }

        // create jwt (JSON web token )
        app.post('/used-jwt', (req, res) => {
            const user = req.body;
            const createToken = jwt.sign({ uid: user?.uid }, secretToken);
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

        // insert product 
        app.post('/product', verifyJWT, async (req, res) => {
            const uid = req.decoded.uid;
            const product = req.body;
            if (uid !== product?.authorID) {
                return res.status(403).send({ message: 'unautorized' });
            }
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        // get my products 
        app.get('/my-products/:uid', verifyJWT, async (req, res) => {
            const decodedUid = req.decoded.uid;
            const uid = req.params.uid;
            if (uid !== decodedUid) {
                return res.status(403).send({ message: 'unautorized' });
            }
            const query = { authorID: uid };
            const result = await productsCollection.find({}).toArray();
            res.send(result);
        });

        // advertise status update 
        app.patch('/my-products/:id', verifyJWT, async (req, res) => {
            const decodedUid = req.decoded.uid;
            const uid = req.body.uid;
            if (uid !== decodedUid) {
                return res.status(403).send({ message: 'unautorized' });
            }
            const status = req.body.status;
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    advertise: status
                }
            }
            const result = await productsCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        //delete product 
        app.delete('/my-products/:id', verifyJWT, async (req, res) => {
            const decodedUid = req.decoded.uid;
            const uid = req.body.uid;
            if (uid !== decodedUid) {
                return res.status(403).send({ message: 'unautorized' });
            }
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        // get category
        app.get('/category', async (req, res) => {
            const query = {};
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        });

        // add category
        app.post('/category', async (req, res) => {
            const category = req.body;
            const result = await categoryCollection.insertOne(category);
            res.send(result);
        });

        // delete category
        app.delete('/category/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await categoryCollection.deleteOne(query);
            res.send(result);
        });

        // get users info by uid 
        app.get('/users/:id', async (req, res) => {
            const uid = req.params.id;
            const query = { uid: uid };
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        // admin function
        app.get('/all-users', verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            const query = role ? { role } : {};
            const result = await userCollection.find(query).toArray();
            res.send(result);
        });

        // admin function
        app.put('/all-users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const query = {
                uid: id
            };
            const updatedDoc = {
                $set: {
                    verified: status?.verified
                }
            }
            const upsert = {
                upsert: true,
            }
            const result = await userCollection.updateOne(query, updatedDoc, upsert);
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