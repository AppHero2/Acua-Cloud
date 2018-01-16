var express = require('express');
/**
 * Stripe Initialization
 */ 

var stripe = require('stripe')(process.env.STRIPE_SECURITY_KEY);
var router = express.Router();

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


function createCharge(charge) {

    return new Promise((resolve, reject) => {

        stripe.charges.create(charge, (err, res) => {

            if (err) return reject(err);
            //create transaction
            return resolve(res);
            
        });
    });
}

router.post('/charge', (req, res, next) => {

    const phoneNumber = req.body.phoneNumber;
    const serviceType = req.body.serviceType;
    const stripeToken = req.body.stripeToken;
    const serviceCost = req.body.serviceCost;
    const currencyUnit = req.body.currencyUnit;

    console.log('phoneNumber : ' + phoneNumber);

    stripe.customers.create({
        description: serviceType,
        email: phoneNumber,
        source: stripeToken
      }, function(error, customer) {
        if (customer) {
            console.log('customerId: ', customer.id);
            const charge = {
                'amount': serviceCost,
                'currency': currencyUnit==null?'zar':currencyUnit,
                'customer': customer.id
            };
            createCharge(charge).then((res1) => {
                console.log(res1);
                res.status(200).send(res1);
            }).catch((err) => {
                console.log(err);
                res.status(402).send(err);
            });  
        }else if (error) {
            res.status(402).send(error);
        }
      });

});

/**
 * Retrieve the customer object for the currently logged in user
 */
router.get('/customer', (req, res, next) => {

    var customerId = req.body.customerId;

    stripe.customers.retrieve(customerId, (err, customer) => {
        if (err) {

            res.status(402).send('Error retrieving customer.');
        }else {
            res.json(customer);
        }
    });
});

/**
 * Attach a new payment source to the customer for the currently logged in user
 */

router.post('/customer/sources', (req, res, next) => {
    var customerId = req.body.customerId;

    stripe.customers.createSource(customerId, {
        source: req.body.source
    }, (err, source) => {
        if (err) {
            res.status(402).send('Error attaching source.');
        }else {
            res.status(200).end();
        }
    });
});

/**
 * Select a new default payment source on the customer for the currently logged in user
 */

router.post('/customer/default_source', (req, res) => {
    var customerId = req.body.customerId;
    stripe.customers.update(customerId, {
        default_source: req.body.defaultSource
    }, (err, customer) => {
        if (err) {
            res.status(402).send('Error setting default source');
        } else {
            res.status(200).end();
        }
    })
});

module.exports = router;

