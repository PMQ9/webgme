# MoE Metamodel Quick Start Guide

This guide helps you quickly set up and use the Mixture-of-Experts (MoE) metamodel in WebGME.

## Setup (One-Time)

### 1. Start WebGME

```bash
# Windows
setup\start-local.bat

# Linux/macOS
./setup/start-local.sh
```

Access WebGME at: http://127.0.0.1:8888

### 2. Create New Project

1. Click "Create New Project"
2. Name: "MoE_System"
3. Click "Create"

### 3. Run Metamodel Generator

1. Right-click on **ROOT** in Project Navigator
2. Select "Execute Plugin"
3. Choose "MoE Metamodel Generator v1"
4. Click "Run"
5. Wait for "Plugin finished successfully" message

The metamodel is now created!

## Creating Your First MoE Model

### Step-by-Step

1. **Open Composition View**
   - Click on ROOT in Project Navigator
   - You should see the metamodel elements in the canvas

2. **Create MoE_System Container**
   - Drag `MoE_System` from Parts Browser (right panel)
   - Drop it on canvas
   - Double-click to enter it

3. **Add Datasets**
   Inside MoE_System, add datasets:
   - Drag `GTSRB_Dataset` to canvas
   - Drag `CIFAR10_Dataset` to canvas
   - Drag `MNIST_Dataset` to canvas

4. **Add Expert Models**
   - Drag `UltraVerifiableCNN_Expert` to canvas (for GTSRB)
   - Rename it: right-click → Rename → "GTSRB_Expert"
   - Drag `TinyCNN_Expert` to canvas (for CIFAR10)
   - Rename: "CIFAR10_Expert"
   - Drag `TinyCNN_Expert` to canvas (for MNIST)
   - Rename: "MNIST_Expert"

5. **Configure Expert Attributes**
   For each expert, select it and set in Property Editor:

   **GTSRB_Expert**:
   - `model_path`: `artifacts/gtsrb_ultra_verifiable_cnn_best.pth`
   - `frozen`: `true`
   - `accuracy`: `0.87`

   **CIFAR10_Expert**:
   - `model_path`: `artifacts/cifar10_tiny_cnn_best.pth`
   - `frozen`: `true`
   - `accuracy`: `0.95`

   **MNIST_Expert**:
   - `model_path`: `artifacts/mnist_tiny_cnn_best.pth`
   - `frozen`: `true`
   - `accuracy`: `0.98`

6. **Link Experts to Datasets**
   - Click connection tool (or press 'C')
   - Select `TrainedOn` connection type
   - Click GTSRB_Expert (source)
   - Click GTSRB_Dataset (destination)
   - Repeat for CIFAR10_Expert → CIFAR10_Dataset
   - Repeat for MNIST_Expert → MNIST_Dataset

7. **Create MetaMoE System**
   - Drag `MetaMoE` to canvas
   - Rename: "MyMetaMoE"
   - Double-click to enter it

8. **Add Router**
   Inside MetaMoE:
   - Drag `Router` to canvas
   - Configure in Property Editor:
     - `backbone_arch`: `ultra_verifiable_cnn`
     - `num_experts`: `3`
     - `top_k`: `1`
     - `temperature`: `1.0`

9. **Add Experts to MetaMoE**
   Inside MetaMoE:
   - Drag `UltraVerifiableCNN_Expert` (for GTSRB)
   - Drag `TinyCNN_Expert` (for CIFAR10)
   - Drag `TinyCNN_Expert` (for MNIST)
   - Configure each with same model_path as before

10. **Create Routing Connections**
    - Click connection tool
    - Select `RoutesTo` connection type
    - From Router to each Expert (3 connections total)

11. **Go Back and Add Training Config**
    - Navigate back to MoE_System (click breadcrumb)
    - Drag `TrainingConfig` to canvas
    - Configure:
      - `epochs`: `100`
      - `batch_size`: `64`
      - `learning_rate`: `0.001`
      - `adv_training`: `true`
      - `adv_mode`: `TRADES`

12. **Link MetaMoE to Config**
    - Create `UsesConfig` connection
    - From MyMetaMoE to TrainingConfig

## Your Model is Complete!

You now have a working MoE model with:
- 3 datasets (GTSRB, CIFAR10, MNIST)
- 3 trained experts
- 1 router
- 1 MetaMoE system
- Training configuration

## What You Can Do Now

### Visualize the Architecture
- Navigate through your model
- See connections between components
- View attributes of each element

### Export Configuration (Future Plugin)
Once code generation plugins are created, you'll be able to:
- Generate training scripts
- Export to YAML/JSON
- Generate evaluation commands

### Modify and Experiment
Try different configurations:
- Change expert architectures
- Adjust router parameters
- Add more datasets/experts
- Modify training configs

## Common Model Patterns

### Two-Expert MoE (GTSRB + CIFAR10)
```
MetaMoE
├── Router (num_experts=2)
├── GTSRB_Expert (UltraVerifiableCNN)
└── CIFAR10_Expert (TinyCNN)
```

### Three-Expert MoE (All Datasets)
```
MetaMoE
├── Router (num_experts=3)
├── GTSRB_Expert (UltraVerifiableCNN)
├── CIFAR10_Expert (TinyCNN)
└── MNIST_Expert (TinyCNN)
```

### Verification-Optimized (All UltraVerifiableCNN)
```
MetaMoE
├── Router (ultra_verifiable_cnn)
├── GTSRB_Expert (UltraVerifiableCNN)
├── CIFAR10_Expert (UltraVerifiableCNN)
└── MNIST_Expert (UltraVerifiableCNN)
```

## Keyboard Shortcuts

- **C**: Create connection
- **Delete**: Delete selected element
- **Ctrl+C**: Copy
- **Ctrl+V**: Paste
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo

## Troubleshooting

### Can't see Parts Browser
- Click "Parts" tab on right panel
- Or press 'P' key

### Connection won't create
- Ensure source/destination types are correct
- TrainedOn: Expert → Dataset
- RoutesTo: Router → Expert
- UsesConfig: MetaMoE → TrainingConfig

### MetaMoE shows error
- Must have exactly 1 Router
- Must have at least 2 Experts

### Plugin not in menu
- Restart WebGME server
- Check `config/config.default.js` has plugin path

## Next Steps

1. Create multiple MoE configurations
2. Compare different architectures
3. Export models to research codebase (when plugins ready)
4. Use for demonstrations and experiments

## Documentation

- Full Guide: `src/plugins/MoE_Metamodel_ver1/README.md`
- MoE Research: `D:\Mixture-of-Experts_Research\CLAUDE.md`
- WebGME Docs: https://webgme.readthedocs.io/

## Support

For issues or questions:
1. Check full README in plugin folder
2. Consult WebGME documentation
3. Review MoE research codebase
