# MoE Metamodel Generator v1

## Overview

This plugin creates a complete metamodel for Mixture-of-Experts (MoE) architectures used in the Vanderbilt ISIS safety-critical systems research project.

## What It Creates

The plugin generates a comprehensive Domain-Specific Modeling Language (DSML) for designing and configuring MoE systems. The metamodel includes:

### Core Classes

1. **MoE_System** - Top-level container for all MoE components
   - Can contain: MetaMoE, ExpertModels, Routers, Datasets, TrainingConfigs, Connections

2. **ExpertModel** - Base class for neural network experts
   - Attributes:
     - `architecture`: Model architecture name
     - `num_params`: Number of parameters
     - `frozen`: Whether the model is frozen (boolean)
     - `accuracy`: Model accuracy (0.0-1.0)
     - `model_path`: Path to .pth file

3. **Expert Architecture Variants**:
   - **UltraVerifiableCNN_Expert** (96K params) - Optimized for formal verification
   - **MicroCNN_Expert** (67K params) - Small efficient model
   - **TinyCNN_Expert** (620K params) - For CIFAR10/MNIST
   - **SmallCNN_Expert** (1.5M params) - For complex datasets like GTSRB

4. **Router** - Routes inputs to appropriate experts
   - Attributes:
     - `backbone_arch`: Router architecture (ultra_verifiable_cnn, etc.)
     - `top_k`: Number of experts to activate (usually 1)
     - `temperature`: Temperature scaling for softmax
     - `num_experts`: Total number of experts

5. **Dataset** - Represents training/test datasets
   - Attributes:
     - `dataset_name`: Name (GTSRB, CIFAR10, MNIST)
     - `num_classes`: Number of classes
     - `meta_class_id`: ID for dataset-level routing (0=GTSRB, 1=CIFAR10, 2=MNIST)
     - `img_size`: Image size (32x32 default)

   **Variants**:
   - **GTSRB_Dataset** (43 classes, meta_class_id=0)
   - **CIFAR10_Dataset** (10 classes, meta_class_id=1)
   - **MNIST_Dataset** (10 classes, meta_class_id=2)

6. **MetaMoE** - Complete MoE system container
   - Must contain exactly 1 Router
   - Must contain at least 2 ExpertModels
   - Attributes:
     - `model_path`: Path to trained MetaMoE .pth file
     - `router_accuracy`: Router classification accuracy
     - `overall_accuracy`: Overall system accuracy

7. **TrainingConfig** - Training hyperparameters
   - Attributes:
     - `epochs`: Number of training epochs
     - `batch_size`: Batch size
     - `learning_rate`: Learning rate
     - `adv_training`: Enable adversarial training (boolean)
     - `adv_mode`: Adversarial training mode ('PGD' or 'TRADES')
     - `trades_beta`: TRADES beta parameter (6.0 default)

### Relationships (Connections)

1. **TrainedOn** - Links Expert to Dataset
   - Source: ExpertModel
   - Destination: Dataset
   - Represents: "This expert was trained on this dataset"

2. **RoutesTo** - Links Router to Expert
   - Source: Router
   - Destination: ExpertModel
   - Attributes:
     - `routing_score`: Routing confidence/weight
   - Represents: "Router can route to this expert"

3. **UsesConfig** - Links MetaMoE to TrainingConfig
   - Source: MetaMoE
   - Destination: TrainingConfig
   - Represents: "MetaMoE uses this training configuration"

## How to Use

### Step 1: Run the Plugin

1. Start your WebGME server
2. Create a new project or open an existing one
3. Right-click on the ROOT node in the Project Navigator
4. Select "Execute Plugin" → "MoE Metamodel Generator v1"
5. Click "Run"

The plugin will create all metamodel elements in your project's metamodel layer.

### Step 2: Create an MoE System Model

After the metamodel is created, you can create model instances:

1. **Create MoE_System Container**:
   - Drag `MoE_System` from the Parts Browser to your canvas
   - This is your top-level container

2. **Add Datasets**:
   - Drag dataset types into the MoE_System:
     - `GTSRB_Dataset`
     - `CIFAR10_Dataset`
     - `MNIST_Dataset`

3. **Add Expert Models**:
   - Drag expert architectures into MoE_System:
     - `UltraVerifiableCNN_Expert` (recommended for verification)
     - `MicroCNN_Expert` (compact)
     - `TinyCNN_Expert` (CIFAR10/MNIST)
     - `SmallCNN_Expert` (GTSRB)

4. **Configure Experts**:
   - Select each expert
   - Set attributes in Property Editor:
     - `model_path`: e.g., `artifacts/gtsrb_ultra_verifiable_cnn_best.pth`
     - `frozen`: `true` if pre-trained
     - `accuracy`: e.g., `0.87`

5. **Link Experts to Datasets**:
   - Create `TrainedOn` connections
   - Drag from expert to dataset
   - Represents training relationship

6. **Create MetaMoE System**:
   - Drag `MetaMoE` into MoE_System
   - Add 1 Router inside MetaMoE
   - Add 2+ Experts inside MetaMoE (can copy/reference existing experts)

7. **Configure Router**:
   - Set `num_experts` to match number of experts
   - Set `backbone_arch` to match expert architectures
   - Set `top_k` to 1 (typically)

8. **Create Routing Connections**:
   - Create `RoutesTo` connections from Router to each Expert
   - Represents routing capability

9. **Add Training Configuration**:
   - Drag `TrainingConfig` into MoE_System
   - Set training parameters
   - Link to MetaMoE with `UsesConfig` connection

## Example Model Structure

```
MoE_System
├── GTSRB_Dataset (meta_class_id=0, 43 classes)
├── CIFAR10_Dataset (meta_class_id=1, 10 classes)
├── MNIST_Dataset (meta_class_id=2, 10 classes)
│
├── GTSRB_Expert (UltraVerifiableCNN, 96K params)
│   └─[TrainedOn]→ GTSRB_Dataset
│
├── CIFAR10_Expert (TinyCNN, 620K params)
│   └─[TrainedOn]→ CIFAR10_Dataset
│
├── MNIST_Expert (TinyCNN, 620K params)
│   └─[TrainedOn]→ MNIST_Dataset
│
├── TrainingConfig
│   ├── epochs: 100
│   ├── batch_size: 64
│   ├── adv_training: true
│   └── adv_mode: 'TRADES'
│
└── MetaMoE
    ├── Router (ultra_verifiable_cnn, top_k=1, num_experts=3)
    │   ├─[RoutesTo]→ GTSRB_Expert
    │   ├─[RoutesTo]→ CIFAR10_Expert
    │   └─[RoutesTo]→ MNIST_Expert
    │
    ├── GTSRB_Expert (reference/copy)
    ├── CIFAR10_Expert (reference/copy)
    ├── MNIST_Expert (reference/copy)
    │
    └─[UsesConfig]→ TrainingConfig
```

## Validation Rules

The metamodel enforces these constraints:

1. **MetaMoE**:
   - Must contain exactly 1 Router
   - Must contain at least 2 ExpertModels

2. **Connections**:
   - `TrainedOn`: 1 Expert → 1 Dataset
   - `RoutesTo`: 1 Router → 1 Expert (multiple instances allowed)
   - `UsesConfig`: 1 MetaMoE → 1 TrainingConfig

3. **Containment**:
   - Only MoE_System can contain top-level components
   - MetaMoE can only contain Router and ExpertModels

## Next Steps

After creating your model:

1. **Validate**: Ensure all required connections are present
2. **Export**: Use code generation plugins (to be created) to:
   - Generate training scripts
   - Generate configuration files
   - Generate evaluation scripts

## Architecture Comparison

| Architecture | Parameters | Best For | Accuracy (GTSRB) |
|--------------|-----------|----------|------------------|
| UltraVerifiableCNN | 96K | Verification | 87% |
| MicroCNN | 67K | Speed | 95-97% |
| TinyCNN | 620K | CIFAR10/MNIST | 95-97% |
| SmallCNN | 1.5M | Complex datasets | 97-99% |

## Dataset Specifications

| Dataset | Classes | Meta_class_id | Image Size | Domain |
|---------|---------|---------------|------------|---------|
| GTSRB | 43 | 0 | 32x32 | Traffic signs |
| CIFAR10 | 10 | 1 | 32x32 | Objects |
| MNIST | 10 | 2 | 32x32 | Handwritten digits |

## Troubleshooting

### Plugin doesn't appear in menu
- Check that `config.plugin.basePaths` is set in `config/config.default.js`
- Restart WebGME server

### Can't create connections
- Ensure source and destination types match connection constraints
- Check that nodes are in the correct container (MoE_System)

### MetaMoE validation fails
- Verify exactly 1 Router inside MetaMoE
- Verify at least 2 Experts inside MetaMoE

## Related Files

- **Plugin Code**: `src/plugins/MoE_Metamodel_ver1/MoE_Metamodel_ver1.js`
- **Metadata**: `src/plugins/MoE_Metamodel_ver1/metadata.json`
- **Config**: `config/config.default.js`
- **MoE Research**: `D:\Mixture-of-Experts_Research\`

## References

- MoE Research Project: `D:\Mixture-of-Experts_Research\CLAUDE.md`
- WebGME Documentation: https://webgme.readthedocs.io/
- Training Scripts: `D:\Mixture-of-Experts_Research\train.py`
