const PacketTrafficCtrl = {};
const ElasticClientCtrl = {};
const PacketTraffic = require("../models/PacketTraffic")
const ElasticClient = require("../elasticclient/elasticclient")
PacketTrafficCtrl.sendPacketTraffic = async (req, res) => {

	const { rp, sp, rhp, shp, dpm, brd, fwd, pme, dst, nfm, ivi, ladd } = req.body;

	let totalreceived = parseInt(rhp) + parseInt(dpm) + parseInt(brd) + parseInt(ivi) + parseInt(nfm);

	const recpackets = rp;

	const sendpackets = sp;
	const rechellopackets = rhp;
	const sendhellopackets = shp;
	const datapackme = dpm;
	const broadcast = brd;
	const fwdpackets = fwd;
	const packetsforme = pme;
	const dstinyunreach = dst;
	const notforme = nfm;
	const iamvia = ivi;
	const localaddress = ladd;
	let senddatapackets = parseInt(sp) - parseInt(shp);

	const PacketTrafficPos = new PacketTraffic({ recpackets, sendpackets, rechellopackets, sendhellopackets, datapackme, broadcast, fwdpackets, packetsforme, dstinyunreach, notforme, iamvia, localaddress, totalreceived });
	//DEBUG
	//console.log("total received :"+totalreceived);
	//DEBUG
	//console.log("iamvia content "+ivi);
	//DEBUG
	//console.log("local address is "+ladd);
	const Client = ElasticClient.getClient();
	let todaystring = new Date();
	let today = new Date()
	const years = today.getFullYear();
	const month = today.getMonth();
	const days = today.getDate();
	const hours = today.getHours();
	const minutes = today.getMinutes();
	const seconds = today.getSeconds();
	const miliseconds = today.getMilliseconds();
	//const todaystring = `${years}-${month}-${days}T${hours}:${minutes}:${seconds}.${miliseconds}Z`
	//console.log(today.toISOString())
	//today = new Date(todaystring.toISOString())
	indexMonitorization(Client, rp, sp, rhp, shp, dpm, brd, fwd, pme, dst, nfm, ivi, ladd, totalreceived, senddatapackets, today,todaystring).then(function (value) {
		// DEBUG
		//console.log(value)
	}).catch(function (e) {
		//console.log(e)
	})
	const { body } = getLocalAddress(Client).then(value => {
		UpdateQuery(value, Client,localaddress)
		//console.log(value)
		/*.then(function (value) {
			//console.log(value)
		}).catch(function (e) {
			//console.log(e)
		})*/
	}).catch(function (e) {
		//console.log(e)
	})
	
	const index = indexDataLost(Client, ladd, rp, senddatapackets, today,todaystring).then(function (value) {
		// DEBUG
		//console.log(value)
	}).catch(function (e) {
		//console.log(e)
	})
	const indexhello = indexHelloLost(Client, ladd, rhp, shp, today,todaystring).then(function (value) {
		// DEBUG
		//console.log(value)
	}).catch(function (e) {
		//console.log(e)
	})
	await Client.indices.refresh({ index: 'monitorization3' })
	await Client.indices.refresh({ index: 'datalostpackets'})
	await Client.indices.refresh({ index: 'hellolostpackets'})
	await PacketTrafficPos.save().then(function (value) {
		res.status(200).json({ msg: "postoki" })
	}).catch(function (e) {
		res.status(401).send("error saving info" + e)
	})

};
ElasticClientCtrl.run = async (req, res) => {
	const { address, metric, lastSeqNo, timeout, via, position } = req.body;



	res.status(200).json({ msg: "postoki" })
};

const getLocalAddress = async (Client) => {
	try {
		const response = await Client.search({
			index: 'datalostpackets',
			body: {
				aggs: {
					unique_ladd: {
						terms: {
							field: 'localaddress'
						}
					}
				}
			}


		})
		
		return response
	} catch (error) {
		//console.log(error)
	}
}
const UpdateQuery = async (value, Client,localaddress) => {
	//console.log(value)
	const nonempty = (value.aggregations.unique_ladd.buckets?.length ? true : false)
	console.log(nonempty)
	if (nonempty) {

		try {
			const loop = await Promise.allSettled(value.aggregations.unique_ladd.buckets.map(async (i) => {
				let obj = i
				console.log(obj['key'])
				console.log(localaddress)

				if(obj != localaddress)
				{
				const myquerydata =  updateDataLostPackets(Client,i).catch(function (e) {
					//console.log(e)
				})
				const myqueryhello = updateHelloLostPackets(Client,i).catch(function (e) {
					//console.log(e)
				})
			

			}
			})
			).then(function(value){
				//console.log(value)
			}).catch(function(e){
				//console.log(e)
			})
			return loop
		} catch (error) {
			//console.log(error)
		}

	}
}

const indexDataLost = async (Client, ladd, rp, senddatapackets, today,todaystring) => {
	try {
		const indexret = await Client.index({
			index: 'datalostpackets',
			body: {
				localaddress: ladd.toString('utf-8'),
				lostpackets: 0,
				recpackets: rp,
				sentdatapackets: senddatapackets,
				theoreticalrecpackets: 0,
				timestamp: today.setTime(Date.parse(todaystring.toISOString()))
			}
		})
		
		return indexret
	} catch (error) {
		//console.log(error)
	}

}

const indexHelloLost = async (Client, ladd, rhp, shp, today,todaystring) => {
	try {
		const index = await Client.index({
			index: 'hellolostpackets',
			body: {
				localaddress: ladd.toString('utf-8'),
				losthpackets: 0,
				rechpackets: rhp,
				senthellopackets: shp,
				theoreticalrecpackets: 0,
				timestamp: today.setTime(Date.parse(todaystring.toISOString()))
			}
		})
		return index
	} catch (error) {
		//console.log(error)

	}

}
const indexMonitorization = async (Client, rp, sp, rhp, shp, dpm, brd, fwd, pme, dst, nfm, ivi, ladd, totalreceived, senddatapackets, today,todaystring) => {
	try {
		const index = await Client.index({

			index: 'monitorization3',
			body: {
				recpackets: rp,
				sendpackets: sp,
				rechellopackets: rhp,
				sendhellopackets: shp,
				datapackme: dpm,
				broadcast: brd,
				fwdpackets: fwd,
				packetsforme: pme,
				dstinyunreach: dst,
				notforme: nfm,
				iamvia: ivi,
				localaddress: ladd.toString('utf-8'),
				totalreceived: totalreceived,
				senddatapackets: senddatapackets,
				timestamp: today.setTime(Date.parse(todaystring.toISOString()))

			}
		})

		return index
	} catch (error) {
		//console.log(error)
	}

}
//gpsCtrl.getgps = async(req, res) =>{
//  const gps = await Gps.find();
//res.send(JSON.stringify(gps));
// return res.status(200).json({
//     data: gps
// });
//}

const updateDataLostPackets = async(Client,obj) => {
	try {
	const update = await Client.updateByQuery({
	index: 'datalostpackets',
	refresh: true,
	
	 body:{
		script: {

			lang: 'painless',

			source: 'ctx._source.theoreticalrecpackets++;ctx._source.lostpackets=ctx._source.theoreticalrecpackets-ctx._source.recpackets'
		}
	}
	,
	query: {
		bool: {
			must: [{ match: { localaddress: obj['key'] } }]
		}
	}

	,
	sort:{
		timestamp:'desc'
	},
	max_docs:1


})
console.log(update)
return update
	}catch(error){
		console.log(error)
	}
}

const updateHelloLostPackets = async(Client,obj) => {
	try{
	const update = await Client.updateByQuery({
	index: 'hellolostpackets',
	refresh: true,
	body:{

		script: {

			lang: 'painless',

			source: 'ctx._source.theoreticalrecpackets++;ctx._source.losthpackets=ctx._source.theoreticalrecpackets-ctx._source.rechpackets;'

		}
	}
	,
	query: {
		bool: {
			must: [{ match: { localaddress: obj['key'] } }]
		}
	}

	,
	sort: {
		timestamp:'desc'
	
	},
	max_docs: 1


})
console.log(update)
return update
}catch(error){
	console.log(error)
}
}
module.exports = PacketTrafficCtrl;


