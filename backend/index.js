const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET);
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@yoga-master.azqvqgb.mongodb.net/?appName=yoga-master`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// JWT verification middleware
function verifyJWT(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).send('A token is required for authentication');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
  return next();
}

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const database = client.db("yoga-master");
    const userCollection = database.collection("users");
    const classesCollection = database.collection("classes");
    const cartCollection = database.collection("cart");
    const enrolledCollection = database.collection("enrolled");
    const paymentCollection = database.collection("payments");
    const appliedCollection = database.collection("applied");

    // Define your routes inside the run function after the client is connected
    
    app.post('/new-user', async (req, res) => {
        const newUser = req.body;

        const result = await userCollection.insertOne(newUser);
        res.send(result);
    })
    app.post('/api/set-token', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_SECRET, { expiresIn: '24h' })
        res.send({ token })
    })


    // GET ALL USERS
    app.get('/users', async (req, res) => {
        const users = await userCollection.find({}).toArray();
        res.send(users);
    })
    // GET USER BY ID
    app.get('/users/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const user = await userCollection.findOne(query);
        res.send(user);
    })
    // GET USER BY EMAIL
    app.get('/user/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await userCollection.findOne(query);
        res.send(result);
    })
    // Delete a user

    app.delete('/delete-user/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
    })
    // UPDATE USER
    app.put('/update-user/:id', async (req, res) => {
        const id = req.params.id;
        const updatedUser = req.body;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.option,
                address: updatedUser.address,
                phone: updatedUser.phone,
                about: updatedUser.about,
                photoUrl: updatedUser.photoUrl,
                skills: updatedUser.skills ? updatedUser.skills : null,
            }
        }
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })
    
    
    
    
    
    
    // classes
    
    
    
    app.post('/new-class', async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    app.get('/classes', async (req, res) => {
      const query = { status: 'approved' };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/classes/:email', async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/classes-manage', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.put('/change-status/:id', async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const reason = req.body.reason;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
          reason: reason
        }
      };
      const result = await classesCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get('/approved-classes', async (req, res) => {
      const query = { status: 'approved' };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/class/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });

    app.put('/update-class/:id', async (req, res) => {
      const id = req.params.id;
      const updatedClass = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: updatedClass.name,
          description: updatedClass.description,
          price: updatedClass.price,
          availableSeats: parseInt(updatedClass.availableSeats),
          videoLink: updatedClass.videoLink,
          status: 'pending'
        }
      };
      const result = await classesCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.post('/add-to-cart', async (req, res) => {
      const newCartItem = req.body;
      const result = await cartCollection.insertOne(newCartItem);
      res.send(result);
    });

    app.get('/cart-item/:id', async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      const query = {
        classId: id,
        userMail: email
      };
      const projection = { classId: 1 };
      const result = await cartCollection.findOne(query, { projection: projection });
      res.send(result);
    });

    app.get('/cart/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userMail: email };
      const projection = { classId: 1 };
      const carts = await cartCollection.find(query, { projection: projection }).toArray();
      const classIds = carts.map(cart => new ObjectId(cart.classId));
      const query2 = { _id: { $in: classIds } };
      const result = await classesCollection.find(query2).toArray();
      res.send(result);
    });

    app.delete('/delete-cart-item/:id', async (req, res) => {
      const id = req.params.id;
      const query = { classId: id };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // PAYMENT ROUTES
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    // POST PAYMENT INFO 
    app.post('/payment-info', async (req, res) => {
      const paymentInfo = req.body;
      const classesId = paymentInfo.classesId;
      const userEmail = paymentInfo.userEmail;
      const singleClassId = req.query.classId;
      let query;

      if (singleClassId) {
        query = { classId: singleClassId, userMail: userEmail };
      } else {
        query = { classId: { $in: classesId } };
      }

      const classesQuery = { _id: { $in: classesId.map(id => new ObjectId(id)) } };
      const classes = await classesCollection.find(classesQuery).toArray();
      const newEnrolledData = {
        userEmail: userEmail,
        classesId: classesId.map(id => new ObjectId(id)),
        transactionId: paymentInfo.transactionId,
      };
      const updatedDoc = {
        $set: {
          totalEnrolled: classes.reduce((total, current) => total + current.totalEnrolled, 0) + 1 || 0,
          availableSeats: classes.reduce((total, current) => total + current.availableSeats, 0) - 1 || 0,
        }
      };

      const updatedResult = await classesCollection.updateMany(classesQuery, updatedDoc, { upsert: true });
      const enrolledResult = await enrolledCollection.insertOne(newEnrolledData);
      const deletedResult = await cartCollection.deleteMany(query);
      const paymentResult = await paymentCollection.insertOne(paymentInfo);
      res.send({ paymentResult, deletedResult, enrolledResult, updatedResult });
    });

    app.get('/payment-history/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.get('/payment-history-length/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const total = await paymentCollection.countDocuments(query);
      res.send({ total });
    });

    // ENROLLED ROUTES
    app.get('/popular_classes', async (req, res) => {
      const result = await classesCollection.find().sort({ totalEnrolled: -1 }).limit(6).toArray();
      res.send(result);
    });

    app.get('/popular-instructors', async (req, res) => {
      const pipeline = [
        {
          $group: {
            _id: "$instructorEmail",
            totalEnrolled: { $sum: "$totalEnrolled" },
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "email",
            as: "instructor"
          }
        },
        {
          $project: {
            _id: 0,
            instructor: {
              $arrayElemAt: ["$instructor", 0]
            },
            totalEnrolled: 1
          }
        },
        {
          $sort: {
            totalEnrolled: -1
          }
        },
        {
          $limit: 6
        }
      ];
      const result = await classesCollection.aggregate(pipeline).toArray();
      res.send(result);
    });

    // Admin stats
    app.get('/admin-stats', async (req, res) => {
      const approvedClasses = (await classesCollection.find({ status: 'approved' }).toArray()).length;
      const pendingClasses = (await classesCollection.find({ status: 'pending' }).toArray()).length;
      const instructors = (await userCollection.find({ role: 'instructor' }).toArray()).length;
      const totalClasses = (await classesCollection.find().toArray()).length;
      const totalEnrolled = (await enrolledCollection.find().toArray()).length;
      const result = {
        approvedClasses,
        pendingClasses,
        instructors,
        totalClasses,
        totalEnrolled,
      };
      res.send(result);
    });

    // Get all instructors
    app.get('/instructors', async (req, res) => {
      const result = await userCollection.find({ role: 'instructor' }).toArray();
      res.send(result);
    });

    app.get('/enrolled-classes/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const pipeline = [
        {
          $match: query
        },
        {
          $lookup: {
            from: "classes",
            localField: "classesId",
            foreignField: "_id",
            as: "classes"
          }
        },
        {
          $unwind: "$classes"
        },
        {
          $lookup: {
            from: "users",
            localField: "classes.instructorEmail",
            foreignField: "email",
            as: "instructor"
          }
        },
        {
          $project: {
            _id: 0,
            classes: 1,
            instructor: {
              $arrayElemAt: ["$instructor", 0]
            }
          }
        }
      ];
      const result = await enrolledCollection.aggregate(pipeline).toArray();
      res.send(result);
    });

    // Applied route
    app.post('/as-instructor', async (req, res) => {
      const data = req.body;
      const result = await appliedCollection.insertOne(data);
      res.send(result);
    });

    app.get('/applied-instructors/:email', async (req, res) => {
      const email = req.params.email;
      const result = await appliedCollection.findOne({ email });
      res.send(result);
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
