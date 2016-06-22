var _ = require("lodash");
var moment = require("moment");

var UNFINISHED_PRICES_INTERVAL = 10000;
var Api = function(app) {
	var self = this;
	var config = app.config;
	var DB = app.DB;
	self.actualPrices = {};

	var Yahoo = require(config.dirCore+"HistYahoo");

	this.getOrders = function(req, res) {
		var limit = parseInt(req.query.limit) || null;

		DB.getData('*', "log", '1=1', 'DESC, open_date DESC, close_date DESC', limit, function(err, data) {
			res.json(data);
		});
	};
	
	this.postOrder = function (req, res) {
		var body = _.pick(req.body, ["ticker", "amount", "price"]);
		var data = {};
		data.amount = parseInt(body.amount);
		data.ticker = body.ticker.substr(0, 10).toUpperCase();
		data.open_price = Number(body.price);

		DB.insert("log", data, function (err, dbRes) {
			if(err) {
				console.error("Order insert:", err);
				return res.status(500).json({error: "DB issue"});
			}
			else
				res.json({ok: true});
		});
	};


	this.getActualPrices = function(req, res) {
		res.json(self.actualPrices);
	};

	this.loadUfinishedPrices = function() {
		DB.getData('ticker', 'log', 'close_date IS NULL', function(err, tickers) {
			tickers = tickers.map(function(p) {
				return p.ticker;
			});
			Yahoo.actual(tickers, function(err, res) {
				var out = {};

				if(err)
					_.noop("There was an error when requesting actual prices from Yahoo API", err);
				else if(res)
					res.map(function(d) {
						out[d[0]] = {
							price: d[1],
							date: moment().format("D.M.YYYY hh:mm:ss")
						};
					});

				self.actualPrices = out;
			});
		});
	};

	self.loadUfinishedPrices();
	setInterval(self.loadUfinishedPrices, UNFINISHED_PRICES_INTERVAL);
	
	return this;
};

module.exports = function(app) {
    return new Api(app);
};