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
        for (const vertex in this.vertexes) {
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
            var cycle = [];
            for (var v = C;; v = this.parent[v]) {
                cycle.push(v);
                if (v == C && cycle.length > 1)
                    break;
            }
            // Reverse cycle[]
            cycle.reverse();
            // Printing the negative cycle
            for(var v of cycle) console.log(v + " -> ");
            console.log("");
        }
        else {
            console.log(-1);
        }
    }
}

module.exports = UniswapGraph