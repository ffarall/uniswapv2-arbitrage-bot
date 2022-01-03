class Edge {
    constructor(from, to, weight)
    {
        this.src = from;
        this.dest = to;
        this.weight = weight;
    }
}

// Class to represent a directed and weighted graph
class UniswapGraph {
    constructor(vertexes, routes) {
        this.populate(vertexes, routes);
    }

    populate(vertexes, routes) {
        // V. Number of vertices, E. Number of edges
        this.vertexes = vertexes;
        this.V = vertexes.length;
        this.E = routes.length;
        // graph is represented as an array of edges.
        this.edges = [];

        for (const element of routes) {
            const tokenPair = element["tokens"];
            const route = element["route"];
            const weight = -Math.log(route.midPrice.toSignificant(6));
            
            this.edges.push(new Edge(tokenPair[0], tokenPair[1], weight));
        }
    }

    detectArbitrage(src) {
        // Finds a negative cycle using Bellman-Ford algorithm.
        this.dist = new Map();
        this.parent = new Map();

        // Initialize distances from src to all other vertices as INFINITE and all parent as -1
        for (const vertex of this.vertexes) {
            this.dist[vertex] = Number.MAX_VALUE;
            this.parent[vertex] = -1;
        }
        this.dist[src] = 0;

        // Relax all edges |this.V| - 1 times.
        for (var i = 1; i < this.V; i++) {
            for (var j = 0; j < this.E; j++) {
                var u = this.edges[j].src;
                var v = this.edges[j].dest;
                var weight = this.edges[j].weight;

                if (this.dist[u] != Number.MAX_VALUE && this.dist[u] + weight < this.dist[v]) {
                    this.dist[v] = this.dist[u] + weight;
                    this.parent[v] = u;
                }
            }
        }

        // Check for negative-weight cycles
        var C = -1;
        for (var i = 0; i < this.E; i++) {
            var u = this.edges[i].src;
            var v = this.edges[i].dest;
            var weight = this.edges[i].weight;
            if (this.dist[u] != Number.MAX_VALUE && this.dist[u] + weight < this.dist[v]) {
                // Store one of the vertex of the negative weight cycle
                C = v;
                break;
            }
        }

        if (C != -1) {
            for (var i = 0; i < this.V; i++)
                C = this.parent[C];
            // To store the cycle vertex
            this.negCycle = [];
            for (var v = C;; v = this.parent[v]) {
                if (v == C && this.negCycle.length > 1) {
                    break;
                } else {
                    this.negCycle.push(v);
                }
            }

            // if (!cycle.includes(src)) {
            //     console.log(`Negative cycle exists but doesn't include ${src}.`);
            //     return false;
            // }

            // // Reverce cycle
            // this.negCycle.reverse();

            // Reordering cycle so that it starts with src
            reorder: {
                for (var i = 0; i < this.negCycle.length; i++) {
                    if (this.negCycle[0] == src) {
                        this.negCycle.push(src);
                        this.negCycle.reverse();
                        break reorder;
                    }
                    // Rotate.
                    this.negCycle.unshift(this.negCycle.pop());

                } // else
                console.log(`Negative cycle exists but doesn't include ${src}.`);
                return false;
            }

            // Printing the negative cycle
            this.gain = 1;
            console.log("----------------- NEGATIVE CYCLE FOUND -----------------");
            process.stdout.write(this.negCycle[0]);
            for (var i = 0; i < this.negCycle.length - 1; i++) {
                let weight = Math.exp(-this.getEdge(this.negCycle[i], this.negCycle[i+1]));
                this.gain *= weight;
                process.stdout.write(`--( ${weight.toPrecision(6)} )--> ` + this.negCycle[i+1]);
            }
            console.log("");

            this.gain -= 1;
            console.log(`With gain of ${(this.gain * 100).toPrecision(6)}%.`);
            return true;
        }
        else {
            console.log("No negative cycle.");
            return false;
        }
    }

    printShortestPaths(src) {
        console.log("----------------- SHORTEST PATHS FOUND -----------------");

        for (const vertex of this.vertexes) {
            if (vertex != src) {
                var path = [vertex];
                var prev = vertex;
                while (prev != src) {
                    prev = this.parent[prev];
                    path.push(prev);
                }

                // Reverse path[]
                path.reverse();
                // Printing the shortest path to this vertex
                console.log(`Shortest path for ${vertex}`);
                process.stdout.write(path[0]);
                for (var i = 0; i < path.length - 1; i++) {
                    process.stdout.write(` --( ${this.getEdge(path[i], path[i+1]).toPrecision(6)} )--> ` + path[i+1]);
                }
                console.log("");
                console.log(`Distance from ${src} to ${vertex}: ${this.dist[vertex].toPrecision(6)}`);
                console.log("");
            }
        }
    }

    getEdge(src, dest) {
        for (const edge of this.edges) {
            if (edge.src == src && edge.dest == dest) {
                return edge.weight;
            }
        }
    }
}

module.exports = UniswapGraph;