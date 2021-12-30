const jsgraphs = require("js-graph-algorithms");

class Grapher {

    graph;

    populateCryptoGraph(routes, vertexes) {
        this.graph = new jsgraphs.WeightedDiGraph(vertexes.length);

        for (const element of routes) {
            const tokenPair = element["tokens"];
            const route = element["route"];

            const firstTokenIndex = vertexes.indexOf(tokenPair[0]);
            const secondTokenIndex = vertexes.indexOf(tokenPair[1]);
            this.graph.node(firstTokenIndex).label = tokenPair[0];
            this.graph.node(secondTokenIndex).label = tokenPair[1];

            const weight = -Math.log(route.midPrice.toSignificant(6));
            this.graph.addEdge(new jsgraphs.Edge(firstTokenIndex, secondTokenIndex, weight));
        }

        console.log(this.graph);
    }

    detectArbitrage() {
        let bf = new jsgraphs.BellmanFord(this.graph, 0);
        bf.run();

        for(var v = 1; v < this.graph.V+1; ++v){
            if(bf.hasPathTo(v)){
                var path = bf.pathTo(v);
                console.log('=====path from 0 to ' + v + ' start==========');
                for(var i = 0; i < path.length; ++i) {
                    var e = path[i];
                    console.log(e.from() + ' => ' + e.to() + ': ' + e.weight);
                }
                console.log('=====path from 0 to ' + v + ' end==========');
                console.log('=====distance: '  + bf.distanceTo(v) + '=========');
            }
        }

        bf.run(bf.V + 1);
        for(var v = 1; v < this.graph.V+1; ++v){
            if(bf.hasPathTo(v)){
                var path = bf.pathTo(v);
                console.log('=====path from 0 to ' + v + ' start==========');
                for(var i = 0; i < path.length; ++i) {
                    var e = path[i];
                    console.log(e.from() + ' => ' + e.to() + ': ' + e.weight);
                }
                console.log('=====path from 0 to ' + v + ' end==========');
                console.log('=====distance: '  + bf.distanceTo(v) + '=========');
            }
        }
    }
}

module.exports = Grapher