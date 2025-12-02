# MetaMoE Metamodel for WebGME

## Overview

This document defines the domain-specific modeling language (DSML) metamodel for the MetaMoE (Mixture-of-Experts) architecture. It describes all the entities, attributes, relationships, and constraints needed to model a mixture-of-experts system in WebGME.

---

## WebGME Implementation Status

### Entities Created in WebGME

Based on the current WebGME metamodel implementation, the following entities exist:

**Base Types:**
- FCO (base object for all entities)

**Core Components:**
- Router
- Experts
- MetaMoE_Model
- Dataset (base class)
- Architecture (base class)
- Training_Config

**Dataset Instances:**
- GTSRB_Dataset
- MNIST_Dataset
- CIFAR10_Dataset

**Architecture Instances:**
- VerifiableCNN
- MicroCNN
- SmallCNN

### Current Attributes (from WebGME)

**Router attributes:**
- hidden_dim (integer)
- input_channels (integer)
- input_height (integer)
- input_width (integer)
- temperature (number)
- training_mode (string)

**Experts attributes:**
- input_channels (integer)
- input_height (integer)
- input_width (integer)
- is_frozen (boolean)
- meta_class (integer)
- model_architecture (string)
- num_classes (integer)
- output_class_offset (integer)
- robust_accuracy (float)
- verified (boolean)

**MetaMoE_Model attributes:**
- name (string)
- meta_temperature (float)
- gating_temperature (float)
- num_experts (integer)

**Dataset attributes:**
- dataset_id (integer)
- normalization_mean (string)
- normalization_std (string)
- num_classes (integer)
- num_test_samples (integer)
- num_training_samples (integer)

**Architecture attributes:**
- conv_channels (integer)
- fc_hidden_dims (integer)
- input_channels (integer)
- input_height (integer)
- input_width (integer)
- num_conv_layers (integer)
- num_fc_layers (integer)
- num_parameters (integer)
- pooling_type (string)
- use_batch_norm (boolean)
- verification_compatible (boolean)

**Training_Config attributes:**
- adversarial_train... (boolean)
- adversarial_train_mode (string)
- batch_size (integer)
- classification_lo... (float)
- epochs (integer)
- gating_loss_weight (float)
- learning_rate (float)
- load_balancing... (float)
- weight_decay (float)

### Current Relationships (from WebGME diagram)

1. FCO → All entities (inheritance base)
2. Router → MetaMoE_Model (composition, 1:1)
3. Router → Experts (association, 1:*)
4. Experts → Architecture (association)
5. Experts → Dataset instances (GTSRB, MNIST, CIFAR10)
6. Dataset (base) → Dataset instances (inheritance)
7. Architecture (base) → Architecture instances (VerifiableCNN, MicroCNN, SmallCNN) (inheritance)
8. Training_Config → MetaMoE_Model (association)

---

## 1. Core Entities

### 1.1 MetaMoE System (Root Container)

**Purpose**: Top-level container representing a complete Mixture-of-Experts system

**Attributes**:
- `name` (string, default: "MetaMoE_Model"): System identifier
- `description` (string): System documentation
- `meta_top_k` (integer, 1-10, default: 1): Number of top experts to activate per sample
- `gating_temperature` (number, default: 1.0): Temperature scaling for router softmax
- `load_balancing_weight` (number, default: 0.01): Weight for load balancing loss during training
- `total_parameters` (integer, read-only): Total params (router + all experts)

**Contains**:
- 1 Router (required)
- 1+ Experts (required: at least 2)
- 0+ Datasets (usually same count as experts)
- 1 TrainingConfiguration (optional)
- 1 VerificationConfiguration (optional)

---

### 1.2 Router (MetaGatingNet)

**Purpose**: Dataset-level routing network that selects which expert(s) to activate

**Key Concept**: Routes **entire images** to frozen expert models based on input

**Attributes**:
- `name` (string, default: "MetaGatingNet"): Router identifier
- `gating_backbone` (enum): Architecture type
  - Options: ultra_verifiable_cnn, nnv_cnn, micro_cnn, tiny_cnn, small_cnn, convnext_tiny, resnet50, efficientnet_b0
  - Default: ultra_verifiable_cnn (96K params, verification-friendly)
- `input_channels` (integer, default: 3)
- `input_height` (integer, default: 32)
- `input_width` (integer, default: 32)
- `hidden_dim` (integer, default: 256)
- `num_parameters` (integer, read-only): Total parameters
- `temperature` (number, default: 1.0): Softmax temperature for routing decisions
- `use_batch_norm` (boolean, default: false): Include BatchNorm layers
- `training_mode` (enum): How router was trained
  - Options: supervised, adversarial, trades, trades
  - Default: supervised
- `adversarial_epsilon` (number, default: 0.03137): Perturbation bound for adversarial training (8/255)
- `model_path` (string): Path to saved router weights
- `accuracy` (number 0-1): Routing accuracy on clean data
- `robust_accuracy` (number 0-1): Routing accuracy under adversarial perturbation
- `temperature_scaling` (number, default: 1.0)

**Relationships**:
- `routes_to` → Expert (1..* experts): Which experts this router can select

**Output**:
- Logits with shape [batch_size, num_experts]
- Softmax with temperature to get routing probabilities

---

### 1.3 Expert

**Purpose**: Frozen pre-trained model for a specific dataset

**Key Concept**: Each expert specializes in one dataset (CIFAR-10, MNIST, GTSRB, etc.)

**Attributes**:
- `name` (string, default: "Expert_0"): Expert identifier
- `expert_id` (integer, default: 0): Unique ID (0, 1, 2, ...)
- `model_architecture` (enum): Architecture type
  - Options: ultra_verifiable_cnn, nnv_cnn, micro_cnn, tiny_cnn, small_cnn, convnext_tiny, resnet50, efficientnet_b0
  - Default: ultra_verifiable_cnn
- `input_channels` (integer, default: 3)
- `input_height` (integer, default: 32)
- `input_width` (integer, default: 32)
- `num_parameters` (integer, read-only): Total parameters
- `num_classes` (integer, default: 10): Number of output classes for this expert
- `output_class_offset` (integer, default: 0): Starting index in unified output space
  - Example: Expert 0 (CIFAR10): offset=0, classes 0-9
  - Example: Expert 1 (MNIST): offset=10, classes 10-19
- `training_mode` (enum): How expert was trained
  - Options: nrt (Non-Robust Training), at (Adversarially Trained), trades
  - Default: nrt
  - **Important**: NRT = standard supervised learning (previously called NAT)
- `adversarial_epsilon` (number, default: 0.03137): Epsilon used in training (8/255 = 0.03137)
- `is_frozen` (boolean, default: true): Weights frozen during MetaMoE training
- `model_path` (string): Path to saved expert weights
  - Example: "paper/artifacts/E_0_CNN_AT/cifar10_ultra_verifiable_cnn_best_RT_eps0.031.pth"
- `accuracy` (number 0-1): Clean accuracy on own dataset
- `robust_accuracy` (number 0-1): Accuracy under adversarial perturbation
- `verified` (boolean, default: false): Whether formally verified

**Relationships**:
- `trained_on_dataset` → Dataset (1..1): Which dataset this expert is trained on
- `output_classes` → Class (1..* classes): Classes this expert can predict

**Output**:
- Logits with shape [batch_size, num_classes]
- Only these classes are activated by the router

---

### 1.4 Dataset

**Purpose**: Definition of a training dataset for an expert

**Attributes**:
- `name` (string, default: "CIFAR10"): Dataset identifier
- `dataset_id` (integer, default: 0): Meta-class ID
  - 0 = GTSRB (traffic signs, 43 classes)
  - 1 = CIFAR-10 (objects, 10 classes)
  - 2 = MNIST (digits, 10 classes)
- `num_classes` (integer, default: 10)
- `num_training_samples` (integer, default: 50000)
- `num_test_samples` (integer, default: 10000)
- `input_channels` (integer, default: 3)
- `input_height` (integer, default: 32)
- `input_width` (integer, default: 32)
- `data_path` (string): Path to dataset directory
  - Format: "data/CIFAR10/Training/" etc.
- `normalization_mean` (string, JSON array): e.g. "[0.491, 0.482, 0.447]"
- `normalization_std` (string, JSON array): e.g. "[0.247, 0.244, 0.262]"
- `augmentation_enabled` (boolean, default: true)
- `augmentation_type` (enum):
  - Options: none, standard, cutmix, mixup
  - Default: standard

**Contains**:
- 1..* Classes (each representing a class in the dataset)

---

### 1.5 Class

**Purpose**: Represents a classification category

**Attributes**:
- `name` (string): Class label (e.g., "cat", "dog", "Speed limit 30")
- `class_id` (integer): Local ID within expert's output space (0 to num_classes-1)
- `global_class_id` (integer): Global ID in unified MetaMoE output space
  - Computed as: expert.output_class_offset + class_id
- `num_samples` (integer): Number of training samples for this class
- `description` (string): Documentation for this class

**Parent**: Dataset

---

## 2. Configuration Entities

### 2.1 TrainingConfiguration

**Purpose**: Hyperparameters and settings for MetaMoE training

**Attributes**:
- `name` (string, default: "Training_Config")
- `epochs` (integer, default: 100)
- `batch_size` (integer, default: 128)
- `learning_rate` (number, default: 0.001)
- `optimizer` (enum): adam, sgd, adamw (default: adam)
- `scheduler_type` (enum): constant, linear, cosine, exponential (default: cosine)
- `weight_decay` (number, default: 1e-4)
- `gating_loss_weight` (number, default: 1.0): Weight for routing loss
- `load_balancing_loss_weight` (number, default: 0.01): Encourages uniform expert usage
- `fine_tune_mode` (boolean, default: false): Whether adding new expert incrementally
- `freeze_existing_experts` (boolean, default: true): Keep old experts frozen
- `adversarial_training_enabled` (boolean, default: false): Train router robustly
- `adversarial_training_mode` (enum): pgd, trades (default: pgd)
- `pgd_steps` (integer, default: 7): Number of PGD iterations
- `pgd_step_size` (number, default: 0.01)
- `trades_beta` (number, default: 6.0): KL divergence weight for TRADES
- `validation_split` (number, default: 0.1): Fraction of data for validation
- `early_stopping_patience` (integer, default: 10): Epochs to wait before stopping

**Example Training Scenarios**:
1. **Supervised Training**:
   - adversarial_training_enabled = false
   - training_mode = supervised

2. **Adversarial Router Training (PGD)**:
   - adversarial_training_enabled = true
   - adversarial_training_mode = pgd
   - pgd_steps = 7

3. **Adversarial Router Training (TRADES)**:
   - adversarial_training_enabled = true
   - adversarial_training_mode = trades
   - trades_beta = 6.0

---

### 2.2 VerificationConfiguration

**Purpose**: Formal verification settings for robustness certification

**Attributes**:
- `name` (string, default: "Verification_Config")
- `verification_tool` (enum):
  - Options: nnv, alpha_beta_crown, sampling
  - Recommended: alpha_beta_crown (state-of-the-art, wins VNN-COMP)
- `verification_type` (enum):
  - Options: formal, sampling
  - formal = proves robustness guarantees (slow)
  - sampling = tests robustness on samples (fast, empirical)
- `epsilon` (number, default: 0.00784): Perturbation bound (2/255 is standard)
  - 2/255 = 0.00784 (standard)
  - 4/255 = 0.01569 (larger)
  - 8/255 = 0.03137 (very large, matches adversarial training)
- `num_samples` (integer, default: 100): How many samples to verify
- `timeout_seconds` (integer, default: 300): Max time per image
- `use_batch_norm_folding` (boolean, default: true): Fold BN into conv for ONNX
- `export_onnx` (boolean, default: true): Export model to ONNX format

---

### 2.3 PerformanceMetrics

**Purpose**: Measured performance of the MetaMoE system

**Attributes** (all computed/measured):
- `accuracy` (number 0-1): Clean accuracy on test set
- `robust_accuracy` (number 0-1): Accuracy under adversarial perturbation
- `inference_time_ms` (number): Average inference time
- `model_size_mb` (number): Total model size on disk
- `energy_efficiency` (string): Measured energy consumption
- `expert_utilization` (string): How often each expert is selected
  - Example: "Expert_0: 45%, Expert_1: 55%"

---

## 3. Relationships and Constraints

### Containment Hierarchy
```
MetaMoESystem
├── Router
│   └── connects to: Expert(s)
├── Expert(s)
│   ├── trained_on: Dataset
│   └── outputs: Class(es)
├── Dataset(s)
│   └── contains: Class(es)
├── TrainingConfiguration (optional)
└── VerificationConfiguration (optional)
```

### Key Relationships

| From | To | Type | Cardinality | Label | Meaning |
|------|-----|------|-------------|-------|---------|
| MetaMoESystem | Router | composition | 1..1 | contains | System has exactly 1 router |
| MetaMoESystem | Expert | aggregation | 1..* | uses_experts | System has ≥2 experts |
| Router | Expert | association | 1..* | routes_to | Router can select any expert |
| Expert | Dataset | association | 1..1 | trained_on | Expert trained on specific dataset |
| Expert | Class | association | 1..* | outputs | Expert outputs these classes |
| Dataset | Class | composition | 1..* | contains | Dataset has ≥1 class |

### Constraints

1. **Class ID Consistency**:
   - Each Expert must have `num_classes` matching its output classes
   - `global_class_id` = `expert.output_class_offset` + `class.class_id`
   - No overlapping class ranges between experts

2. **Expert Freezing**:
   - During MetaMoE training: `is_frozen = true` for all experts
   - Only Router weights are updated
   - Exception: Fine-tuning mode can add new unfrozen expert

3. **Router Output Dimension**:
   - Router output logits: shape [batch_size, num_experts_in_system]
   - Routed to top-k experts via `meta_top_k`

4. **Unified Output Space**:
   - Total output classes = sum of all expert classes
   - Example with 2 experts:
     - Expert 0 (CIFAR10): 10 classes, offset=0 → output classes [0-9]
     - Expert 1 (MNIST): 10 classes, offset=10 → output classes [10-19]
     - MetaMoE output: 20 classes total

5. **Input Consistency**:
   - All components must have same input dimensions:
     - Router input: (3, 32, 32)
     - All Experts input: (3, 32, 32)
     - Dataset normalized to same size

---

## 4. Enum Values

### Router/Expert Architecture Options
```
ultra_verifiable_cnn   # 96K params, verification-friendly, 87% acc (recommended)
nnv_cnn                # 100K params, NNV compatible, 95% acc
micro_cnn              # 67K params, fast training, 95% acc
tiny_cnn               # 620K params, balanced, 98% acc
small_cnn              # 1.5M params, high accuracy, 99% acc
convnext_tiny          # 28M params, large model
resnet50               # Very large, general purpose
efficientnet_b0        # Efficient scaling
```

### Training Mode (Expert)
```
nrt                    # Non-Robust Training (standard supervised, no adversarial defense)
at                     # Adversarially Trained (PGD-based robust training)
trades                 # TRADES-based adversarial training
```

### Training Mode (Router)
```
supervised             # Standard supervised learning
adversarial            # PGD-based adversarial training
trades                 # TRADES-based adversarial training
```

### Adversarial Training Type (for Router)
```
pgd                    # Projected Gradient Descent (standard)
trades                 # TRADES (better generalization)
```

### Verification Tool
```
nnv                    # Neural Network Verification (limitations on large networks)
alpha_beta_crown       # alpha-beta-CROWN (state-of-the-art, VNN-COMP winner)
sampling               # Sampling-based robustness verification
```

### Verification Type
```
formal                 # Formal robustness proof (slow, mathematical guarantee)
sampling               # Statistical robustness estimate (fast, empirical)
```

### Augmentation Type
```
none                   # No augmentation
standard               # Standard augmentation (flips, crops, rotations)
cutmix                 # CutMix augmentation (mix patches from 2 images)
mixup                  # Mixup augmentation (interpolate between samples)
```

### Optimizer
```
adam                   # Adam optimizer
sgd                    # Stochastic Gradient Descent
adamw                  # Adam with weight decay
```

### Scheduler Type
```
constant               # No learning rate scheduling
linear                 # Linear decay
cosine                 # Cosine annealing
exponential            # Exponential decay
```

---

## 5. Typical Configurations

### Configuration 1: Basic Supervised MetaMoE
```
MetaMoESystem:
  meta_top_k = 1
  gating_temperature = 1.0

Router:
  gating_backbone = ultra_verifiable_cnn
  training_mode = supervised

Expert 0 (CIFAR10):
  model_architecture = ultra_verifiable_cnn
  training_mode = nrt
  num_classes = 10
  output_class_offset = 0

Expert 1 (MNIST):
  model_architecture = ultra_verifiable_cnn
  training_mode = nrt
  num_classes = 10
  output_class_offset = 10

TrainingConfiguration:
  epochs = 100
  batch_size = 128
  adversarial_training_enabled = false
```

### Configuration 2: Adversarially Trained MetaMoE
```
MetaMoESystem:
  meta_top_k = 1

Router:
  gating_backbone = ultra_verifiable_cnn
  training_mode = adversarial
  adversarial_epsilon = 0.03137

Expert 0 (CIFAR10):
  model_architecture = ultra_verifiable_cnn
  training_mode = at                    # Adversarially Trained
  adversarial_epsilon = 0.03137

Expert 1 (MNIST):
  model_architecture = ultra_verifiable_cnn
  training_mode = at

TrainingConfiguration:
  epochs = 200
  adversarial_training_enabled = true
  adversarial_training_mode = pgd
  pgd_steps = 7
```

### Configuration 3: Fine-Tuning with New Expert
```
MetaMoESystem:
  meta_top_k = 1

Router:
  (reuse from previous configuration)

Expert 0, 1: (frozen from previous training)
  is_frozen = true

Expert 2 (GTSRB - NEW):
  model_architecture = ultra_verifiable_cnn
  training_mode = nrt
  num_classes = 43
  output_class_offset = 20
  is_frozen = false                    # New expert can be trained

TrainingConfiguration:
  fine_tune_mode = true
  freeze_existing_experts = true
  epochs = 50                           # Fewer epochs for fine-tuning
```

### Configuration 4: With Formal Verification
```
VerificationConfiguration:
  verification_tool = alpha_beta_crown
  verification_type = formal
  epsilon = 0.00784                    # 2/255 standard
  num_samples = 100
  timeout_seconds = 300
  export_onnx = true
```

---

## 6. Example Instantiation (Concrete Model)

```
Instance: MetaMoE_CIFAR10_MNIST
├── Router: MetaGatingNet_v1
│   ├── gating_backbone: ultra_verifiable_cnn
│   ├── num_parameters: 96000
│   ├── accuracy: 0.97
│   └── routes_to: [Expert_CIFAR10, Expert_MNIST]
│
├── Expert_CIFAR10
│   ├── model_architecture: ultra_verifiable_cnn
│   ├── num_classes: 10
│   ├── output_class_offset: 0
│   ├── training_mode: nrt
│   ├── accuracy: 0.93
│   ├── robust_accuracy: 0.87
│   └── trained_on: CIFAR10_Dataset
│
├── Expert_MNIST
│   ├── model_architecture: ultra_verifiable_cnn
│   ├── num_classes: 10
│   ├── output_class_offset: 10
│   ├── training_mode: nrt
│   ├── accuracy: 0.99
│   └── trained_on: MNIST_Dataset
│
├── CIFAR10_Dataset
│   ├── dataset_id: 1
│   ├── num_classes: 10
│   ├── num_training_samples: 50000
│   ├── normalization_mean: [0.491, 0.482, 0.447]
│   └── contains: [Class_0 through Class_9]
│
├── MNIST_Dataset
│   ├── dataset_id: 2
│   ├── num_classes: 10
│   ├── num_training_samples: 60000
│   └── contains: [Class_0 through Class_9]
│
├── TrainingConfiguration
│   ├── epochs: 100
│   ├── batch_size: 128
│   ├── learning_rate: 0.001
│   └── adversarial_training_enabled: false
│
└── VerificationConfiguration
    ├── verification_tool: alpha_beta_crown
    ├── epsilon: 0.00784
    └── num_samples: 100
```

---

## 7. Important Notes on Terminology

**NRT vs AT**:
- **NRT** (Non-Robust Training) = standard supervised learning without adversarial defense
  - *Note*: Previously called NAT (Non-Adversarially Trained), but NRT is the correct term
  - Expert trained normally on clean data
  - Fast training, high clean accuracy
  - Lower robust accuracy under perturbation

- **AT** (Adversarially Trained) = trained with adversarial examples
  - Uses PGD or TRADES to robustify against perturbations
  - Slower training, slightly lower clean accuracy
  - Higher robust accuracy under perturbation
  - Epsilon specifies the perturbation bound used in training

---

## 8. Key Architectural Properties

### Token-Level vs Dataset-Level Routing
- **Token-level MoE** (not in this metamodel): Routes individual tokens within Vision Transformer to experts
- **Dataset-level MoE** (this metamodel): Routes entire images to dataset-specific experts
  - Router sees full image, selects which expert(s) activate
  - Experts are frozen pre-trained models
  - Each expert handles different output classes

### Class Offset Mechanism
- Unified output space combines all expert outputs
- No class conflicts due to explicit offsets
- Example: 2 experts with 10 classes each → 20-class output
  - Router decides: "Route to Expert 1" (MNIST)
  - Get logits [10, 11, 12, ...19] from Expert 1
  - Return classes in unified space

### Load Balancing
- Router trained to balance expert usage
- Loss includes gating_loss + load_balancing_loss
- Prevents router from always selecting one expert
- Weight: `load_balancing_loss_weight`

---

## 9. Files and Models References

### Pre-trained Experts (from CLAUDE.md)
```
paper/artifacts/
├── E_0_CNN_AT/               # CIFAR-10 Adversarially Trained (ε=8/255)
│   └── cifar10_ultra_verifiable_cnn_best_RT_eps0.031.pth
├── E_0_CNN_NAT/              # CIFAR-10 Non-Robustly Trained
│   └── cifar10_ultra_verifiable_cnn_best_NRT.pth
├── E_1_CNN_AT/               # MNIST Adversarially Trained
│   └── mnist_ultra_verifiable_cnn_best_RT_eps0.031.pth
├── E_1_CNN_NAT/              # MNIST Non-Robustly Trained
│   └── mnist_ultra_verifiable_cnn_best_NRT.pth
├── MoE_CNN_AT/               # MoE Router (Adversarial Gating)
│   └── meta_moe_ultra_verifiable_cnn_best_RT_eps0.03137.pth
└── MoE_CNN_NAT/              # MoE Router (Supervised Gating)
    └── meta_moe_ultra_verifiable_cnn_best_NRT.pth
```

### Training Command Example
```bash
# Training with adversarial gating and AT experts
python train.py --meta_moe \
    --model_arch ultra_verifiable_cnn \
    --gating_backbone ultra_verifiable_cnn \
    --cifar10_model_path paper/artifacts/E_0_CNN_AT/cifar10_*.pth \
    --mnist_model_path paper/artifacts/E_1_CNN_AT/mnist_*.pth \
    --adv_gating_train \
    --at_mode TRADES \
    --trades_beta 6.0 \
    --epochs 200
```

---

## 10. Questions for Verification

Please confirm my understanding:

1. **Router Output**: Router always outputs logits for ALL experts, then selects top-k?
   - Or does it output only k logits?

2. **Expert Freezing**: Are experts ALWAYS frozen during MetaMoE training?
   - Exception only when fine-tuning and adding new unfrozen expert?

3. **Loss Functions**: For MetaMoE training:
   - Total loss = classification_loss + gating_loss + load_balancing_loss?
   - Where gating_loss is classification of true meta_class?

4. **Class Space**: When routing to Expert 0 (CIFAR10):
   - Do we output classes [0-9] in the unified output space (0-19)?
   - Or do we output classes [0-9] and then shift by offset?

5. **Top-K Routing**: With `meta_top_k=1`:
   - Only 1 expert is activated (most likely)?
   - Or are multiple experts considered during backprop?

6. **Router Input**: Router sees normalized image directly?
   - Or does it see some feature representation from experts?

7. **Training Data**: During MetaMoE training:
   - Is it a mixed batch of CIFAR10 + MNIST samples?
   - How does the meta_class label guide routing?

8. **Fine-tuning**: When adding 3rd expert (GTSRB):
   - Does router output now have 3 dimensions (routes to 3 experts)?
   - Are old experts kept frozen?
   - Does training data now include GTSRB samples?

---

## Metamodel Entities Summary

| Entity | Count | Purpose |
|--------|-------|---------|
| MetaMoESystem | 1 | Root container |
| Router | 1 | Expert selector |
| Expert | 2+ | Frozen specialist models |
| Dataset | 2+ | Expert training data definitions |
| Class | N | Output categories (1-43 per expert) |
| TrainingConfiguration | 1 | Training hyperparameters |
| VerificationConfiguration | 1 | Verification settings |
| PerformanceMetrics | 1 | Measured performance |

**Total metamodel classes: 8**
**Total properties across all: ~80+**
