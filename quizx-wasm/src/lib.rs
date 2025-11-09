use wasm_bindgen::prelude::*;
use quizx::graph::*;
use quizx::vec_graph::Graph;
use quizx::basic_rules::*;
use quizx::simplify::*;
use serde::{Serialize, Deserialize};

// Set up panic hook for better error messages in the browser.
#[wasm_bindgen(start)]
fn init_wasm() {
    console_error_panic_hook::set_once();
}

/// Vertex type in a ZX-diagram
/// Note: Cannot use #[wasm_bindgen] on enums with modern wasm-bindgen
/// as they require externref. Use u8 representation instead.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VertexType {
    Boundary = 0,
    Z = 1,
    X = 2,
    H = 3,
}

impl From<VertexType> for VType {
    fn from(vt: VertexType) -> Self {
        match vt {
            VertexType::Boundary => VType::B,
            VertexType::Z => VType::Z,
            VertexType::X => VType::X,
            VertexType::H => VType::H,
        }
    }
}

impl From<VType> for VertexType {
    fn from(vt: VType) -> Self {
        match vt {
            VType::B => VertexType::Boundary,
            VType::Z => VertexType::Z,
            VType::X => VertexType::X,
            VType::H => VertexType::H,
            _ => VertexType::Z, // Default for other types
        }
    }
}

/// Vertex information for JavaScript
/// Simple struct for serialization only - no wasm_bindgen
#[derive(Clone, Serialize, Deserialize)]
pub struct VertexInfo {
    id: usize,
    vertex_type: u8,  // Use u8 for JavaScript compatibility
    phase: String,
    row: f64,
    col: f64,
}

/// Edge information for JavaScript
/// Simple struct for serialization only - no wasm_bindgen
#[derive(Clone, Serialize, Deserialize)]
pub struct EdgeInfo {
    source: usize,
    target: usize,
    edge_type: u8, // 0 = Simple (N), 1 = Hadamard (H)
}

/// Main ZX-diagram graph wrapper for WASM
#[wasm_bindgen]
pub struct ZXGraph {
    inner: Graph,
}

#[wasm_bindgen]
impl ZXGraph {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ZXGraph {
        ZXGraph {
            inner: Graph::new(),
        }
    }

    /// Add a vertex to the graph (vertex_type: 0=Boundary, 1=Z, 2=X, 3=H).
    pub fn add_vertex(&mut self, vertex_type: u8) -> usize {
        let vt = match vertex_type {
            0 => VType::B,
            1 => VType::Z,
            2 => VType::X,
            3 => VType::H,
            _ => VType::Z,
        };
        self.inner.add_vertex(vt)
    }

    /// Add a vertex with specific position (vertex_type: 0=Boundary, 1=Z, 2=X, 3=H).
    pub fn add_vertex_with_position(&mut self, vertex_type: u8, row: f64, col: f64) -> usize {
        let vt = match vertex_type {
            0 => VType::B,
            1 => VType::Z,
            2 => VType::X,
            3 => VType::H,
            _ => VType::Z,
        };
        let v = self.inner.add_vertex(vt);
        self.inner.set_row(v, row);
        self.inner.set_qubit(v, col);
        v
    }

    pub fn add_edge(&mut self, source: usize, target: usize) {
        self.inner.add_edge(source, target);
    }

    /// Add an edge with specified type (edge_type: 0=Simple, 1=Hadamard).
    pub fn add_edge_with_type(&mut self, source: usize, target: usize, edge_type: u8) {
        let et = match edge_type {
            1 => EType::H,
            _ => EType::N,  // default
        };
        self.inner.add_edge_with_type(source, target, et);
    }

    pub fn remove_vertex(&mut self, vertex: usize) {
        self.inner.remove_vertex(vertex);
    }

    pub fn remove_edge(&mut self, source: usize, target: usize) {
        self.inner.remove_edge(source, target);
    }

    /// Set the type of an edge (edge_type: 0=Simple, 1=Hadamard).
    /// This removes the existing edge and recreates it with the new type.
    pub fn set_edge_type(&mut self, source: usize, target: usize, edge_type: u8) -> Result<(), String> {
        if !self.inner.connected(source, target) {
            return Err("Edge does not exist".to_string());
        }

        let et = match edge_type {
            0 => EType::N,
            1 => EType::H,
            _ => return Err("Invalid edge type. Must be 0 or 1".to_string()),
        };

        self.inner.remove_edge(source, target);
        self.inner.add_edge_with_type(source, target, et);
        Ok(())
    }

    pub fn set_vertex_position(&mut self, vertex: usize, row: f64, col: f64) {
        self.inner.set_row(vertex, row);
        self.inner.set_qubit(vertex, col);
    }

    /// Set the phase of a vertex (as a rational multiple of π).
    /// For example: phase_str = "1/2" means π/2, "1" means π, "0" means 0.
    pub fn set_vertex_phase(&mut self, vertex: usize, phase_str: &str) -> Result<(), String> {
        use num::rational::Rational64;

        let parts: Vec<&str> = phase_str.trim().split('/').collect();
        let phase = match parts.len() {
            1 => {
                // Just a numerator (e.g., "0", "1", "-1")
                let num = parts[0].parse::<i64>()
                    .map_err(|e| format!("Invalid numerator: {}", e))?;
                Rational64::new(num, 1)
            }
            2 => {
                // Numerator and denominator (e.g., "1/2", "3/4")
                let num = parts[0].parse::<i64>()
                    .map_err(|e| format!("Invalid numerator: {}", e))?;
                let denom = parts[1].parse::<i64>()
                    .map_err(|e| format!("Invalid denominator: {}", e))?;
                Rational64::new(num, denom)
            }
            _ => return Err("Phase must be in format 'num' or 'num/denom'".to_string())
        };

        self.inner.set_phase(vertex, phase);
        Ok(())
    }

    /// Set the type of a vertex (vertex_type: 0=Boundary, 1=Z, 2=X, 3=H).
    pub fn set_vertex_type(&mut self, vertex: usize, vertex_type: u8) -> Result<(), String> {
        let vt = match vertex_type {
            0 => VType::B,
            1 => VType::Z,
            2 => VType::X,
            3 => VType::H,
            _ => return Err("Invalid vertex type. Must be 0-3".to_string()),
        };

        self.inner.set_vertex_type(vertex, vt);
        Ok(())
    }

    pub fn num_vertices(&self) -> usize {
        self.inner.num_vertices()
    }

    pub fn num_edges(&self) -> usize {
        self.inner.num_edges()
    }

    pub fn get_vertices_json(&self) -> String {
        let vertices: Vec<VertexInfo> = self.inner.vertices()
            .map(|v| {
                let vt: VertexType = self.inner.vertex_type(v).into();
                VertexInfo {
                    id: v,
                    vertex_type: vt as u8,
                    phase: format!("{}", self.inner.phase(v)),
                    row: self.inner.row(v),
                    col: self.inner.qubit(v),
                }
            })
            .collect();

        serde_json::to_string(&vertices).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn get_edges_json(&self) -> String {
        let edges: Vec<EdgeInfo> = self.inner.edges()
            .map(|(s, t, et)| EdgeInfo {
                source: s,
                target: t,
                edge_type: match et {
                    EType::N => 0,
                    EType::H => 1,
                    EType::Wio => 0,  // treat Wio same as simple for now
                }
            })
            .collect();

        serde_json::to_string(&edges).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn apply_spider_fusion(&mut self) -> bool {
        match self.inner.find_edge(|v0, v1, _| check_spider_fusion(&self.inner, v0, v1)) {
            Some((v0, v1, _)) => {
                spider_fusion_unchecked(&mut self.inner, v0, v1);
                true
            }
            None => false,
        }
    }

    pub fn full_spider_fusion(&mut self) -> usize {
        let mut count = 0;
        while self.apply_spider_fusion() {
            count += 1;
        }
        count
    }

    /// Remove identity spiders (phase 0, degree 2).
    pub fn simplify_identities(&mut self) -> bool {
        id_simp(&mut self.inner)
    }

    pub fn simplify_local_comp(&mut self) -> bool {
        local_comp_simp(&mut self.inner)
    }

    pub fn simplify_spiders(&mut self) -> bool {
        spider_simp(&mut self.inner)
    }

    pub fn simplify_pivots(&mut self) -> bool {
        pivot_simp(&mut self.inner)
    }

    /// Apply Clifford simplification (combines multiple rules).
    pub fn simplify_clifford(&mut self) -> bool {
        clifford_simp(&mut self.inner)
    }

    /// Apply full simplification (all rules until fully reduced).
    pub fn simplify_full(&mut self) -> bool {
        full_simp(&mut self.inner)
    }

    pub fn to_json(&self) -> String {
        let vertices_json = self.get_vertices_json();
        let edges_json = self.get_edges_json();

        format!(r#"{{"vertices":{},"edges":{}}}"#, vertices_json, edges_json)
    }

    pub fn from_json(json: &str) -> Result<ZXGraph, String> {
        use serde_json::Value;

        let v: Value = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        let mut g = Graph::new();

        if let Some(vertices) = v["vertices"].as_array() {
            for vertex_val in vertices {
                let vertex_type = vertex_val["vertex_type"].as_u64()
                    .ok_or("Missing vertex_type")? as u8;
                let row = vertex_val["row"].as_f64().ok_or("Missing row")?;
                let col = vertex_val["col"].as_f64().ok_or("Missing col")?;

                let vt = match vertex_type {
                    0 => VType::B,
                    1 => VType::Z,
                    2 => VType::X,
                    3 => VType::H,
                    _ => VType::Z,
                };

                let v = g.add_vertex(vt);
                g.set_row(v, row);
                g.set_qubit(v, col);

                // TODO: Handle phase if needed.
            }
        }

        if let Some(edges) = v["edges"].as_array() {
            for edge_val in edges {
                let source = edge_val["source"].as_u64().ok_or("Missing source")? as usize;
                let target = edge_val["target"].as_u64().ok_or("Missing target")? as usize;
                let edge_type = edge_val["edge_type"].as_u64()
                    .ok_or("Missing edge_type")? as u8;

                let et = match edge_type {
                    1 => EType::H,
                    _ => EType::N,
                };

                g.add_edge_with_type(source, target, et);
            }
        }

        Ok(ZXGraph { inner: g })
    }

    pub fn to_string(&self) -> String {
        format!("ZX-graph with {} vertices and {} edges",
                self.num_vertices(),
                self.num_edges())
    }
}
