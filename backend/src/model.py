"""Compact GNN for binary graph classification (human vs machine code).

Node input is a node-type id, embedded with a learned nn.Embedding.
Backbone is configurable: GIN or GraphSAGE, 2-4 layers, hidden dim 128.
Readout is either global mean + max pooling (default, and what every published
result in this repo uses) or attention pooling, followed by an MLP head.

`pooling="meanmax"` reproduces the original readout exactly and leaves the
state_dict keys unchanged, so pre-search checkpoints still load.
"""
import torch
import torch.nn as nn
from torch_geometric.nn import GINConv, SAGEConv, global_max_pool, global_mean_pool
from torch_geometric.nn.aggr import AttentionalAggregation


class ASTGNN(nn.Module):
    def __init__(self, vocab_size: int, hidden: int = 128, num_layers: int = 3,
                 conv: str = "gin", dropout: float = 0.3, num_classes: int = 2,
                 pooling: str = "meanmax"):
        super().__init__()
        assert conv in ("gin", "sage"), f"unknown conv type: {conv}"
        assert 2 <= num_layers <= 4, "use 2, 3 or 4 layers"
        assert pooling in ("meanmax", "attention"), f"unknown pooling: {pooling}"

        self.embedding = nn.Embedding(vocab_size, hidden)
        self.convs = nn.ModuleList()
        self.norms = nn.ModuleList()
        for _ in range(num_layers):
            if conv == "gin":
                mlp = nn.Sequential(
                    nn.Linear(hidden, hidden), nn.ReLU(),
                    nn.Linear(hidden, hidden),
                )
                self.convs.append(GINConv(mlp))
            else:
                self.convs.append(SAGEConv(hidden, hidden))
            self.norms.append(nn.BatchNorm1d(hidden))

        self.dropout = nn.Dropout(dropout)
        self.pooling = pooling
        if pooling == "attention":
            # AttentionalAggregation is the current name for PyG's
            # GlobalAttention: a per-node scalar gate, softmax-normalised
            # within each graph, giving a weighted sum -> hidden dims.
            self.att_pool = AttentionalAggregation(
                gate_nn=nn.Sequential(nn.Linear(hidden, hidden), nn.ReLU(),
                                      nn.Linear(hidden, 1)))
            pooled_dim = hidden
        else:
            self.att_pool = None
            pooled_dim = 2 * hidden  # mean + max concatenation

        self.head = nn.Sequential(
            nn.Linear(pooled_dim, hidden), nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, num_classes),
        )

    def forward(self, x, edge_index, batch):
        h = self.embedding(x)
        for conv, norm in zip(self.convs, self.norms):
            h = conv(h, edge_index)
            h = norm(h).relu()
            h = self.dropout(h)
        if self.att_pool is not None:
            pooled = self.att_pool(h, batch)
        else:
            pooled = torch.cat([global_mean_pool(h, batch),
                                global_max_pool(h, batch)], dim=1)
        return self.head(pooled)

    def num_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


if __name__ == "__main__":
    for conv in ("gin", "sage"):
        model = ASTGNN(vocab_size=90, conv=conv)
        print(f"{conv}: {model.num_parameters():,} parameters")
