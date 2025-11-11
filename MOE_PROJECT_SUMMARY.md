# Mixture of Experts (MoE) Project - Comprehensive Summary

## Table of Contents
1. [What is Mixture of Experts?](#what-is-mixture-of-experts)
2. [Project Overview](#project-overview)
3. [Architecture Deep Dive](#architecture-deep-dive)
4. [Visual Modeling with WebGME](#visual-modeling-with-webgme)
5. [Datasets and Expert Models](#datasets-and-expert-models)
6. [Training Pipeline](#training-pipeline)
7. [Formal Verification](#formal-verification)
8. [Quick Reference](#quick-reference)

---

## What is Mixture of Experts?

**Mixture of Experts (MoE)** is a machine learning architecture where multiple specialized neural networks (called "experts") work together, with a "router" network deciding which expert(s) should handle each input.

### Why MoE?

Traditional approach:
```
┌──────────┐      ┌─────────────────┐      ┌────────┐
│  Input   │─────>│  Single Large   │─────>│ Output │
│  Image   │      │  Neural Network │      │        │
└──────────┘      └─────────────────┘      └────────┘
                   Must handle ALL tasks
                   (traffic signs, objects, digits)
                   Hard to verify, large model
```

MoE approach:
```
                       ┌──────────────────┐
                       │  Router Network  │
                       │  (Decides which  │
                       │   expert to use) │
                       └────────┬─────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          v                     v                     v
    ┌──────────┐          ┌──────────┐          ┌──────────┐
    │ Expert 1 │          │ Expert 2 │          │ Expert 3 │
    │  GTSRB   │          │ CIFAR-10 │          │  MNIST   │
    │ Traffic  │          │ Objects  │          │  Digits  │
    │  Signs   │          │          │          │          │
    └──────────┘          └──────────┘          └──────────┘
    43 classes            10 classes            10 classes

    Specialized models    Smaller models        Easier to verify
```

**Key Benefits:**
- **Specialization**: Each expert focuses on one dataset/domain
- **Efficiency**: Only activate relevant expert (sparse routing)
- **Scalability**: Add new experts without retraining existing ones
- **Verifiability**: Smaller expert models are easier to formally verify

---

## Project Overview

### Research Context

**Institution**: Vanderbilt University - Institute for Software Integrated Systems (ISIS)

**Goal**: Apply Mixture of Experts to **safety-critical systems** (autonomous vehicles, medical devices) where:
- Models must be **formally verifiable** (provable safety guarantees)
- Systems must be **adversarially robust** (resistant to malicious inputs)
- Architecture must be **scalable** and **efficient**

### Two-Level MoE System

This project implements a **hierarchical MoE architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    LEVEL 1: Dataset-Level MoE               │
│                         (MetaMoE)                           │
│                                                             │
│  ┌────────────┐        ┌─────────────────────────────┐      │
│  │   Input    │───────>│  Router (MetaGatingNet)     │      │
│  │   Image    │        │  96K params                 │      │
│  │  32x32x3   │        │  Output: [logit_0, logit_1] │      │
│  └────────────┘        └────────┬────────────────────┘      │
│                                  │                          │
│                    ┌─────────────┼─────────────┐            │
│                    │             │             │            │
│               If logit_0     If logit_1    If logit_2       │
│                > others      > others      > others         │
│                    │             │             │            │
│                    v             v             v            │
│           ┌──────────────┐ ┌──────────────┐ ┌──────────┐    │
│           │  Expert 0    │ │  Expert 1    │ │ Expert 2 │    │
│           │   (GTSRB)    │ │  (CIFAR-10)  │ │ (MNIST)  │    │
│           │              │ │              │ │          │    │
│           │ ┌──────────┐ │ │ ┌──────────┐ │ │┌────────┐│    │
│           │ │ Level 2: │ │ │ │ Level 2: │ │ ││Level 2:││    │
│           │ │Token-MoE │ │ │ │Token-MoE │ │ ││Token...││    │
│           │ │(optional)│ │ │ │(optional)│ │ ││        ││    │
│           │ └──────────┘ │ │ └──────────┘ │ │└────────┘│    │
│           │  96K-1.5M    │ │  96K-620K    │ │ 96K-620K │    │
│           │  params      │ │  params      │ │  params  │    │
│           └──────────────┘ └──────────────┘ └──────────┘    │
│                    │             │             │            │
│                    └─────────────┼─────────────┘            │
│                                  v                          │
│                        ┌─────────────────┐                  │
│                        │  Final Output   │                  │
│                        │  63 classes     │                  │
│                        │  [0-42]: GTSRB  │                  │
│                        │  [43-52]: CIFAR │                  │
│                        │  [53-62]: MNIST │                  │
│                        └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**Level 1 - Dataset-Level MoE (MetaMoE)**:
- Router selects **entire expert model** based on input image
- Each expert is a complete pre-trained CNN frozen in place
- Sparse routing: Only 1 expert active per image (top-k=1)

**Level 2 - Token-Level MoE (Inside Experts, Optional)**:
- Vision Transformer architecture with multiple MoE blocks
- Each transformer block routes **tokens** to different expert MLPs
- Used during individual expert training (not in final MetaMoE)

---

## Architecture Deep Dive

### MetaMoE Components

#### 1. Router (MetaGatingNet)

The router is a lightweight CNN that classifies images by dataset type:

```
Input Image (32x32x3)
      │
      v
┌─────────────────────────────────────┐
│  Router Architecture                │
│  (UltraVerifiableCNN_Features)      │
│                                     │
│  Conv1: 3→20, 3×3, AvgPool 2×2      │  Output: 16×16×20
│  Conv2: 20→28, 3×3, AvgPool 2×2     │  Output: 8×8×28
│  Conv3: 28→40, 3×3, AvgPool 2×2     │  Output: 4×4×40
│  Conv4: 40→56, 3×3, AvgPool 2×2     │  Output: 2×2×56
│                                     │
│  Flatten: 2×2×56 → 224              │
│  FC: 224 → num_experts (2 or 3)     │
│                                     │
│  Parameters: 96,000                 │
└─────────────────────────────────────┘
      │
      v
[logit_GTSRB, logit_CIFAR, logit_MNIST]
      │
      v
  argmax(logits) → Select expert
```

**Key Design Choices:**
- **No BatchNorm**: Ensures deterministic behavior (train/eval consistency)
- **AvgPool instead of MaxPool**: Linear operation, easier for formal verification
- **Gradual channel growth**: 20→28→40→56 (maintains capacity without BatchNorm)
- **Raw logits output**: No softmax during inference (simpler verification)

#### 2. Expert Architectures

Four architectures optimized for different trade-offs:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Expert Architecture Comparison                    │
├─────────────────┬─────────┬──────────┬─────────────┬─────────────────┤
│ Architecture    │ Params  │ Accuracy │ Use Case    │ Verification    │
├─────────────────┼─────────┼──────────┼─────────────┼─────────────────┤
│ UltraVerifiable │ 96K     │ 87%      │ Best for    │ alpha-beta-     │
│ CNN             │         │ (GTSRB)  │ formal      │ CROWN: 100%     │
│                 │         │          │ verification│ success         │
├─────────────────┼─────────┼──────────┼─────────────┼─────────────────┤
│ NNVCompatible   │ 100K    │ 95-97%   │ Baseline    │ Sampling-based  │
│ CNN             │         │          │ comparison  │ only            │
├─────────────────┼─────────┼──────────┼─────────────┼─────────────────┤
│ MicroExpert     │ 67K     │ 95-97%   │ Compact     │ Sampling-based  │
│ CNN             │         │          │ model       │ only            │
├─────────────────┼─────────┼──────────┼─────────────┼─────────────────┤
│ TinyExpert      │ 620K    │ 95-97%   │ CIFAR-10    │ Sampling-based  │
│ CNN             │         │          │ MNIST       │ only            │
├─────────────────┼─────────┼──────────┼─────────────┼─────────────────┤
│ SmallExpert     │ 1.5M    │ 97-99%   │ Complex     │ Sampling-based  │
│ CNN             │         │          │ datasets    │ only            │
│                 │         │          │ (GTSRB)     │                 │
└─────────────────┴─────────┴──────────┴─────────────┴─────────────────┘
```

**UltraVerifiableCNN Architecture** (Recommended):
```
Layer          Input Size    Output Size   Params   Operation
────────────────────────────────────────────────────────────────
Input          32×32×3       32×32×3       -        -
Conv1          32×32×3       32×32×20      560      3×3 kernel, 20 filters
AvgPool1       32×32×20      16×16×20      -        2×2 pooling
Conv2          16×16×20      16×16×28      5,068    3×3 kernel, 28 filters
AvgPool2       16×16×28      8×8×28        -        2×2 pooling
Conv3          8×8×28        8×8×40        10,120   3×3 kernel, 40 filters
AvgPool3       8×8×40        4×4×40        -        2×2 pooling
Conv4          4×4×40        4×4×56        20,216   3×3 kernel, 56 filters
AvgPool4       4×4×56        2×2×56        -        2×2 pooling
Flatten        2×2×56        224           -        -
FC1            224           128           28,800   Dense layer
FC2            128           num_classes   varies   Dense layer
────────────────────────────────────────────────────────────────
Total                                      ~96K     parameters
```

#### 3. Routing Mechanism

```
┌───────────────────────────────────────────────────────────┐
│              MetaMoE Forward Pass                         │
│                                                           │
│  Input: x (batch_size, 3, 32, 32)                         │
│     │                                                     │
│     v                                                     │
│  ┌──────────────────────────────┐                         │
│  │  Router Forward              │                         │
│  │  logits = router(x)          │                         │
│  │  Shape: (batch_size, 3)      │                         │
│  └──────────────┬───────────────┘                         │
│                 │                                         │
│                 v                                         │
│  ┌──────────────────────────────┐                         │
│  │  Expert Selection            │                         │
│  │  expert_idx = argmax(logits) │                         │
│  │  Shape: (batch_size,)        │                         │
│  └──────────────┬───────────────┘                         │
│                 │                                         │
│                 v                                         │
│  ┌──────────────────────────────────────┐                 │
│  │  Batch Splitting by Expert           │                 │
│  │  For each unique expert in batch:    │                 │
│  │    - Get indices where expert_idx==i │                 │
│  │    - Extract corresponding inputs    │                 │
│  │    - Forward through expert_i        │                 │
│  │    - Collect outputs                 │                 │
│  └──────────────┬───────────────────────┘                 │
│                 │                                         │
│                 v                                         │
│  ┌──────────────────────────────────────┐                 │
│  │  Output Assembly                     │                 │
│  │  Combine outputs from all experts:   │                 │
│  │    - Expert 0: classes [0-42]        │                 │
│  │    - Expert 1: classes [43-52]       │                 │
│  │    - Expert 2: classes [53-62]       │                 │
│  │  Shape: (batch_size, total_classes)  │                 │
│  └──────────────────────────────────────┘                 │
│                                                           │
│  Output: Combined logits for all classes                  │
└───────────────────────────────────────────────────────────┘
```

**Example with 3 images**:
```
Batch of 3 images:
  Image 0: Traffic sign (should go to Expert 0)
  Image 1: Cat (should go to Expert 1)
  Image 2: Digit '7' (should go to Expert 2)

Router outputs:
  logits = [[2.1, -0.5, -1.2],   # Image 0: Expert 0 wins
            [-0.3, 3.5, -0.8],    # Image 1: Expert 1 wins
            [-1.1, -0.4, 2.9]]    # Image 2: Expert 2 wins

Expert selection:
  expert_idx = [0, 1, 2]

Processing:
  Expert 0 processes: Image 0 → [43 logits for GTSRB classes]
  Expert 1 processes: Image 1 → [10 logits for CIFAR-10 classes]
  Expert 2 processes: Image 2 → [10 logits for MNIST classes]

Final output (with class offsets):
  Image 0: [expert_0_logits, zeros(10), zeros(10)]  # 63 total
  Image 1: [zeros(43), expert_1_logits, zeros(10)]
  Image 2: [zeros(43), zeros(10), expert_2_logits]
```

---

## Visual Modeling with WebGME

### What is WebGME?

**WebGME** (Web-based Generic Modeling Environment) is a browser-based platform for creating **Domain-Specific Modeling Languages (DSMLs)**. Think of it as a visual programming tool for designing system architectures.

### MoE Metamodel in WebGME

The MoE metamodel provides a **visual language** for designing and configuring MoE systems without writing code.

#### Metamodel Elements

```
┌───────────────────────────────────────────────────────────────┐
│                    MoE Metamodel Class Hierarchy              │
│                                                               │
│  ┌──────────────┐                                             │
│  │ MoE_System   │  Top-level container                        │
│  └──────┬───────┘                                             │
│         │                                                     │
│         ├─── MetaMoE                Complete MoE system       │
│         │      ├─── Router           (exactly 1)              │
│         │      └─── ExpertModel      (at least 2)             │
│         │                                                     │
│         ├─── ExpertModel             Base expert class        │
│         │      ├─── UltraVerifiableCNN_Expert                 │
│         │      ├─── MicroCNN_Expert                           │
│         │      ├─── TinyCNN_Expert                            │
│         │      └─── SmallCNN_Expert                           │
│         │                                                     │
│         ├─── Router                  Routing network          │
│         │                                                     │
│         ├─── Dataset                 Base dataset class       │
│         │      ├─── GTSRB_Dataset    (meta_class_id=0)        │
│         │      ├─── CIFAR10_Dataset  (meta_class_id=1)        │
│         │      └─── MNIST_Dataset    (meta_class_id=2)        │
│         │                                                     │
│         └─── TrainingConfig          Training parameters      │
│                                                               │
│  Connections (Relationships):                                 │
│    - TrainedOn:  ExpertModel ──> Dataset                      │
│    - RoutesTo:   Router ──> ExpertModel                       │
│    - UsesConfig: MetaMoE ──> TrainingConfig                   │
└───────────────────────────────────────────────────────────────┘
```

#### Visual Model Example

A complete MoE system in WebGME looks like this:

```
┌──────────────────────────────────────────────────────────────────┐
│                      MoE_System Container                        │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                   │
│  │ GTSRB_Dataset  │         │ CIFAR10_Dataset│                   │
│  │ meta_class=0   │         │ meta_class=1   │                   │
│  │ 43 classes     │         │ 10 classes     │                   │
│  └────────▲───────┘         └────────▲───────┘                   │
│           │                          │                           │
│           │ TrainedOn                │ TrainedOn                 │
│           │                          │                           │
│  ┌────────┴───────┐         ┌────────┴───────┐                   │
│  │ GTSRB_Expert   │         │ CIFAR10_Expert │                   │
│  │ UltraVerif CNN │         │ TinyCNN        │                   │
│  │ 96K params     │         │ 620K params    │                   │
│  │ accuracy: 0.87 │         │ accuracy: 0.95 │                   │
│  └────────────────┘         └────────────────┘                   │
│                                                                  │
│  ┌────────────────────────────────────────────┐                  │
│  │           MetaMoE Container                │                  │
│  │                                            │                  │
│  │  ┌──────────────────────────────────────┐  │                  │
│  │  │  Router                              │  │                  │
│  │  │  backbone: ultra_verifiable_cnn      │  │                  │
│  │  │  num_experts: 2                      │  │                  │
│  │  │  top_k: 1                            │  │                  │
│  │  └─────┬──────────────┬─────────────────┘  │                  │
│  │        │ RoutesTo     │ RoutesTo           │                  │
│  │        v              v                    │                  │
│  │  ┌──────────┐   ┌──────────┐               │                  │
│  │  │ Expert 0 │   │ Expert 1 │               │                  │
│  │  │  (copy)  │   │  (copy)  │               │                  │
│  │  └──────────┘   └──────────┘               │                  │
│  └────────────────┬───────────────────────────┘                  │
│                   │ UsesConfig                                   │
│                   v                                              │
│  ┌────────────────────────────────────────────┐                  │
│  │      TrainingConfig                        │                  │
│  │      epochs: 100                           │                  │
│  │      batch_size: 64                        │                  │
│  │      learning_rate: 0.001                  │                  │
│  │      adv_training: true                    │                  │
│  │      adv_mode: TRADES                      │                  │
│  └────────────────────────────────────────────┘                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Attributes and Configuration

Each element in the model has configurable attributes:

**ExpertModel Attributes**:
```
┌────────────────────────────────────────┐
│  GTSRB_Expert (UltraVerifiableCNN)     │
├────────────────────────────────────────┤
│  architecture: ultra_verifiable_cnn    │
│  num_params: 96000                     │
│  frozen: true                          │
│  accuracy: 0.87                        │
│  model_path: artifacts/gtsrb_*.pth     │
└────────────────────────────────────────┘
```

**Router Attributes**:
```
┌────────────────────────────────────────┐
│  Router                                │
├────────────────────────────────────────┤
│  backbone_arch: ultra_verifiable_cnn   │
│  num_experts: 3                        │
│  top_k: 1                              │
│  temperature: 1.0                      │
└────────────────────────────────────────┘
```

**Dataset Attributes**:
```
┌────────────────────────────────────────┐
│  GTSRB_Dataset                         │
├────────────────────────────────────────┤
│  dataset_name: GTSRB                   │
│  num_classes: 43                       │
│  meta_class_id: 0                      │
│  img_size: 32                          │
└────────────────────────────────────────┘
```

**TrainingConfig Attributes**:
```
┌────────────────────────────────────────┐
│  TrainingConfig                        │
├────────────────────────────────────────┤
│  epochs: 100                           │
│  batch_size: 64                        │
│  learning_rate: 0.001                  │
│  adv_training: true                    │
│  adv_mode: TRADES                      │
│  trades_beta: 6.0                      │
└────────────────────────────────────────┘
```

### Workflow: From Visual Model to Running System

```
┌─────────────────────────────────────────────────────────────────┐
│                  WebGME to Implementation Pipeline              │
│                                                                 │
│  Step 1: Design in WebGME                                       │
│  ┌────────────────────────────────────┐                         │
│  │  Create visual MoE model           │                         │
│  │  - Drag & drop components          │                         │
│  │  - Configure attributes            │                         │
│  │  - Define connections              │                         │
│  └────────────┬───────────────────────┘                         │
│               │                                                 │
│               v                                                 │
│  Step 2: Generate Configuration (Future Plugin)                 │
│  ┌────────────────────────────────────┐                         │
│  │  Export to YAML/JSON               │                         │
│  │  - Expert configurations           │                         │
│  │  - Router parameters               │                         │
│  │  - Training settings               │                         │
│  └────────────┬───────────────────────┘                         │
│               │                                                 │
│               v                                                 │
│  Step 3: Execute Training                                       │
│  ┌────────────────────────────────────┐                         │
│  │  Run generated commands:           │                         │
│  │  python train.py --config model.yml│                         │
│  └────────────┬───────────────────────┘                         │
│               │                                                 │
│               v                                                 │
│  Step 4: Verify Results                                         │
│  ┌────────────────────────────────────┐                         │
│  │  - Formal verification             │                         │
│  │  - Performance metrics             │                         │
│  │  - Update model attributes         │                         │
│  └────────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Current Status**:
- Metamodel creation: Complete (checkmark)
- Visual modeling: Complete (checkmark)
- Code generation plugins: In Progress (Future work)
- Bidirectional sync: In Progress (Future work)

---

## Datasets and Expert Models

### Dataset Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Dataset Specifications                      │
├──────────┬─────────┬──────────────┬───────────┬──────────────────┤
│ Dataset  │ Classes │ Meta_Class   │ Img Size  │ Domain           │
│          │         │ ID           │           │                  │
├──────────┼─────────┼──────────────┼───────────┼──────────────────┤
│ GTSRB    │ 43      │ 0            │ 32×32     │ Traffic signs    │
│          │         │              │           │ (autonomous      │
│          │         │              │           │  driving)        │
├──────────┼─────────┼──────────────┼───────────┼──────────────────┤
│ CIFAR-10 │ 10      │ 1            │ 32×32     │ Objects          │
│          │         │              │           │ (airplane, car,  │
│          │         │              │           │  bird, etc.)     │
├──────────┼─────────┼──────────────┼───────────┼──────────────────┤
│ MNIST    │ 10      │ 2            │ 32×32     │ Handwritten      │
│          │         │              │           │ digits (0-9)     │
│          │         │              │           │ (grayscale→RGB)  │
└──────────┴─────────┴──────────────┴───────────┴──────────────────┘
```

### Dataset Samples Visualization (Text)

**GTSRB (German Traffic Sign Recognition Benchmark)**:
```
Class Examples:
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│   Stop   │  Warning │  Right   │Pedestrian│    No    │
│   Sign   │          │   Turn   │ Crossing │  Entry   │
└──────────┴──────────┴──────────┴──────────┴──────────┘
Purpose: Autonomous vehicle perception
Challenge: 43 different sign types, real-world distortions
```

**CIFAR-10**:
```
Class Examples:
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ Airplane │    Car   │   Bird   │   Cat    │   Deer   │
└──────────┴──────────┴──────────┴──────────┴──────────┘
Purpose: General object classification
Challenge: Small 32×32 images, 10 diverse categories
```

**MNIST**:
```
Class Examples:
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
Purpose: Digit recognition (checks, forms)
Challenge: Handwriting variation, grayscale→RGB conversion
```

### Expert Training Results

```
┌──────────────────────────────────────────────────────────────────┐
│              Expert Model Performance Summary                    │
├──────────┬──────────────┬────────────┬────────────┬──────────────┤
│ Expert   │ Architecture │ Accuracy   │ Adversarial│ Robustness   │
│          │              │ (Clean)    │ Training   │ (PGD)        │
├──────────┼──────────────┼────────────┼────────────┼──────────────┤
│ GTSRB    │ UltraVerif   │ 87%        │ TRADES     │ ~49%         │
│          │ CNN (96K)    │            │ β=6.0      │ (at ε=2/255) │
├──────────┼──────────────┼────────────┼────────────┼──────────────┤
│ CIFAR-10 │ TinyCNN      │ 95%        │ TRADES     │ ~45%         │
│          │ (620K)       │            │ β=6.0      │              │
├──────────┼──────────────┼────────────┼────────────┼──────────────┤
│ MNIST    │ TinyCNN      │ 98%        │ TRADES     │ ~99%         │
│          │ (620K)       │            │ β=6.0      │ (very robust)│
└──────────┴──────────────┴────────────┴────────────┴──────────────┘
```

### Dataset CSV Structure

All datasets require CSV metadata with `meta_class` labels:

**Training CSV** (`train_with_meta_class.csv`):
```csv
Filename,ClassId,meta_class
00000/00000_00000.ppm,0,0
00000/00000_00001.ppm,0,0
00001/00001_00000.ppm,1,0
```

**Test CSV** (`testset_with_meta_class.csv`):
```csv
Filename,ClassId,meta_class
00000.ppm,16,0
00001.ppm,1,0
00002.ppm,38,0
```

**meta_class values**:
- 0: GTSRB (traffic signs)
- 1: CIFAR-10 (objects)
- 2: MNIST (digits)

---

## Training Pipeline

### Individual Expert Training

```
┌──────────────────────────────────────────────────────────────────┐
│                 Individual Expert Training Flow                  │
│                                                                  │
│  Step 1: Train GTSRB Expert                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ python train.py --dataset GTSRB \                          │  │
│  │                 --model_arch ultra_verifiable_cnn \        │  │
│  │                 --epochs 100 \                             │  │
│  │                 --adv_training \                           │  │
│  │                 --at_mode TRADES                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         v                                                        │
│  Output: artifacts/gtsrb_ultra_verifiable_cnn_best.pth           │
│          artifacts/gtsrb_ultra_verifiable_cnn.onnx               │
│                                                                  │
│  Step 2: Train CIFAR-10 Expert                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ python train.py --dataset CIFAR10 \                        │  │
│  │                 --model_arch tiny_cnn \                    │  │
│  │                 --epochs 100 \                             │  │
│  │                 --adv_training                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         v                                                        │
│  Output: artifacts/cifar10_tiny_cnn_best.pth                     │
│                                                                  │
│  Step 3: Train MNIST Expert                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ python train.py --dataset MNIST \                          │  │
│  │                 --model_arch tiny_cnn \                    │  │
│  │                 --epochs 100                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         v                                                        │
│  Output: artifacts/mnist_tiny_cnn_best.pth                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### MetaMoE Training (Two-Phase)

```
┌──────────────────────────────────────────────────────────────────┐
│                   MetaMoE Training Pipeline                      │
│                                                                  │
│  PHASE 1: Initial Training (2 Experts)                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ python train.py --meta_moe \                               │  │
│  │     --model_arch ultra_verifiable_cnn \                    │  │
│  │     --gating_backbone ultra_verifiable_cnn \               │  │
│  │     --gtsrb_model_path artifacts/gtsrb_*_best.pth \        │  │
│  │     --cifar10_model_path artifacts/cifar10_*_best.pth \    │  │
│  │     --epochs 100 \                                         │  │
│  │     --meta_top_k 1                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  What happens:                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Load frozen experts (GTSRB, CIFAR-10)                   │  │
│  │ 2. Initialize router (random weights)                      │  │
│  │ 3. Create combined dataset (50% GTSRB + 50% CIFAR-10)      │  │
│  │ 4. Training loop:                                          │  │
│  │    For each batch:                                         │  │
│  │      a) Router predicts expert selection                   │  │
│  │      b) Selected expert produces classification            │  │
│  │      c) Compute losses:                                    │  │
│  │         - Classification loss (on final output)            │  │
│  │         - Gating loss (router correctness)                 │  │
│  │      d) Backprop only through router (experts frozen)      │  │
│  │ 5. Save: meta_moe_ultra_verifiable_cnn_best.pth            │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         v                                                        │
│  Output: meta_moe_ultra_verifiable_cnn_best.pth                  │
│          (2-expert MetaMoE system)                               │
│                                                                  │
│  PHASE 2: Fine-Tuning (Add MNIST Expert)                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ python train.py --meta_moe --fine_tune_meta_moe \          │  │
│  │     --model_arch ultra_verifiable_cnn \                    │  │
│  │     --gating_backbone ultra_verifiable_cnn \               │  │
│  │     --meta_moe_path artifacts/meta_moe_*_best.pth \        │  │
│  │     --mnist_model_path artifacts/mnist_*_best.pth \        │  │
│  │     --epochs 50                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  What happens:                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Load existing 2-expert MetaMoE                          │  │
│  │ 2. Add MNIST expert (frozen)                               │  │
│  │ 3. Expand router output layer: 2→3 classes                 │  │
│  │ 4. Training on MNIST data:                                 │  │
│  │    - Router learns to route MNIST to expert 2              │  │
│  │    - Preserve routing for GTSRB/CIFAR-10                   │  │
│  │ 5. Save: meta_moe_*_best_finetuned.pth                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         v                                                        │
│  Output: meta_moe_ultra_verifiable_cnn_best_finetuned.pth        │
│          (3-expert MetaMoE system)                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Loss Functions

**Individual Expert Training**:
```
Total Loss = Classification Loss + Balance Loss

Classification Loss:
  L_cls = LabelSmoothingCrossEntropy(predictions, labels)
  Smoothing factor: 0.1 (prevents overconfidence)

Balance Loss (for token-level MoE):
  L_balance = Variance in expert usage across tokens
  Purpose: Encourage uniform expert utilization

Total: L = L_cls + λ_balance * L_balance
       where λ_balance = 0.01
```

**MetaMoE Training**:
```
Total Loss = Classification Loss + Gating Loss

Classification Loss:
  L_cls = LabelSmoothingCrossEntropy(final_output, true_class)
  Computed on combined output space (63 classes for 3 experts)

Gating Loss:
  L_gating = CrossEntropyLoss(router_logits, true_meta_class)
  Purpose: Train router to select correct expert

Total: L = L_cls + λ_gating * L_gating
       where λ_gating = 1.0
```

**Adversarial Training (TRADES)**:
```
Total Loss = Adversarial CE Loss + KL Divergence

1. Generate adversarial examples:
   x_adv = x + δ, where δ is found via PGD attack

2. Adversarial CE Loss:
   L_adv_ce = CrossEntropyLoss(model(x_adv), y)

3. KL Divergence (consistency regularization):
   L_kl = KL_Divergence(model(x), model(x_adv))
   Purpose: Predictions should be similar for x and x_adv

Total: L = L_adv_ce + β * L_kl
       where β = 6.0 (TRADES parameter)
```

### Training Augmentations

```
┌──────────────────────────────────────────────────────────────────┐
│                    Data Augmentation Pipeline                    │
│                                                                  │
│  Individual Expert Training:                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Random Crop (32×32 with padding=4)                      │  │
│  │ 2. Random Horizontal Flip (p=0.5)                          │  │
│  │ 3. CutMix (p=0.5, alpha=1.0):                              │  │
│  │    - Cut rectangular region from one image                 │  │
│  │    - Paste into another image                              │  │
│  │    - Mix labels proportionally                             │  │
│  │ 4. Normalize (dataset-specific mean/std)                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  MetaMoE Training:                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Random Crop                                             │  │
│  │ 2. Random Horizontal Flip                                  │  │
│  │ 3. Normalize (unified normalization across all datasets)   │  │
│  │    mean = [0.295, 0.291, 0.274]                            │  │
│  │    std  = [0.325, 0.321, 0.319]                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Formal Verification

### Why Verification Matters for Safety-Critical Systems

```
┌──────────────────────────────────────────────────────────────────┐
│              Traditional Testing vs Formal Verification          │
│                                                                  │
│  Traditional Testing:                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Test 1000 images → 99% accuracy                            │  │
│  │                                                            │  │
│  │ Problem: What about the 1 billion other possible inputs?   │  │
│  │          Can't test all possible adversarial perturbations │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Formal Verification:                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Mathematical proof that for ALL inputs in a region:        │  │
│  │   - Model prediction won't change (robustness)             │  │
│  │   - Output satisfies safety property                       │  │
│  │                                                            │  │
│  │ Result: "VERIFIED" or "COUNTEREXAMPLE FOUND"               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Verification Problem Definition

```
Given:
  - Neural network N
  - Input x (e.g., traffic sign image)
  - Perturbation bound ε (e.g., ε = 2/255)

Verify:
  For ALL x' such that ||x' - x|| ≤ ε,
  N(x') produces the same classification as N(x)

Visualization:

      Original       Epsilon Ball        Verify All Points
       Image            Region             in This Region
         x
         │              ┌───────┐
         ▼              │       │
      ┌──────┐          │   x   │
      │ STOP │──────────┤   •   ├───────> Same prediction?
      └──────┘          │       │         (argmax doesn't change)
     Stop Sign          │ ε ball│
                        └───────┘
                     Adversarial
                    perturbations

Interpretation:
  ε = 2/255 means pixel values can change by ±2 (imperceptible to humans)
  If verified: No adversarial perturbation within ε can fool the model
```

### Two Verification Approaches

#### 1. NNV (Neural Network Verification) - MATLAB

```
┌────────────────────────────────────────────────────────────────────────┐
│                 NNV Verification Status: LIMITED                       │
│                                                                        │
│  Tool: NNV (Matlab Toolbox)                                            │
│  Approach: Linear programming with star sets                           │
│                                                                        │
│  Design Attempts:                                                      │
│  [Checkmark] Verification-optimized architecture (UltraVerifiableCNN)  │
│  [Checkmark] BatchNorm folding (eliminate non-linear ops)              │
│  [Checkmark] AvgPool instead of MaxPool (linear operation)             │
│  [Checkmark] Clean ONNX export (15 operators, 0 BatchNorm layers)      │
│                                                                        │
│  Limitation:                                                           │
│  [X] Formal verification TIMES OUT                                     │
│                                                                        │
│  Root Cause:                                                           │
│  - NNV designed for tiny networks (ACAS Xu: 300 neurons)               │
│  - Our CNN: 96K parameters (320× larger)                               │ 
│  - Input: 3,072D vs 5D (614× more dimensions)                          │
│  - Convolutions much harder than fully-connected layers                │
│                                                                        │
│  What Works: Sampling-Based Verification                               │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ >> verify_expert_nnv_simple                                │        │
│  │ Tests: 100 random perturbations in epsilon ball            │        │
│  │ Result: 95% robust (95/100 samples at ε=1/255)             │        │
│  │ Time: ~10 seconds                                          │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                        │
│  Conclusion: Use alpha-beta-CROWN for formal verification              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### 2. alpha-beta-CROWN (RECOMMENDED)

```
┌──────────────────────────────────────────────────────────────────┐
│           alpha-beta-CROWN Verification: SUCCESSFUL              │
│                                                                  │
│  Tool: alpha-beta-CROWN (VNN-COMP 2021-2024 Winner)              │
│  Approach: GPU-accelerated bound propagation with branching      │
│                                                                  │
│  Key Advantages:                                                 │
│  [Checkmark] Handles large CNNs (millions of parameters)         │
│  [Checkmark] GPU acceleration (100× faster than NNV)             │
│  [Checkmark] Formal guarantees with counterexample search        │
│  [Checkmark] ONNX input format (no MATLAB required)              │
│                                                                  │
│  Router Verification Results:                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Model: MetaMoE Router (96K params)                         │  │
│  │ Test: 10 MNIST + 10 CIFAR-10 samples                       │  │
│  │ Epsilon: 2/255 (standard robustness threshold)             │  │
│  │                                                            │  │
│  │ Results:                                                   │  │
│  │   Verified: 20/20 (100%)                                   │  │
│  │   Falsified: 0                                             │  │
│  │   Timeout: 0                                               │  │
│  │   Avg time: 10.82 seconds per sample                       │  │
│  │                                                            │  │
│  │ Interpretation:                                            │  │
│  │   For all 20 test samples, NO adversarial perturbation     │  │
│  │   within ε=2/255 can change the expert selection           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Expert Verification:                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Model: UltraVerifiableCNN Expert (96K params)              │  │
│  │ Scalable to models with millions of parameters             │  │
│  │ Provides robustness certificates for classification        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### How alpha-beta-CROWN Was Adapted for MoE

```
┌──────────────────────────────────────────────────────────────────┐
│            MoE-Specific Verification Innovations                 │
│                                                                  │
│  Challenge 1: MetaMoE has 2M+ parameters (router + experts)      │
│  Solution: Router-Only Verification                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Extract router as standalone ONNX model                    │  │
│  │ Verify router independently (96K params vs 2M+ total)      │  │
│  │ Impact: 20× smaller model, ~11s per sample                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Challenge 2: BatchNorm causes train/eval inconsistency          │
│  Solution: Remove BatchNorm from Router                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ UltraVerifiableCNN_Features: No BatchNorm layers           │  │
│  │ Increased channel capacity to compensate                   │  │
│  │ Impact: Deterministic behavior, 99.97% routing accuracy    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Challenge 3: Temperature-scaled softmax complicates bounds      │
│  Solution: Raw Logits Output                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Router returns raw logits (no softmax, no temperature)     │  │
│  │ Verification property: argmax(logits) doesn't change       │  │
│  │ Impact: Simpler bound propagation                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Challenge 4: Need flexible testing (10 to 10,000 samples)       │
│  Solution: Configurable VNNLIB Generation                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Dynamic sampling with configurable stride                  │  │
│  │ Usage: --num_mnist 100 --num_cifar 100                     │  │
│  │ Auto-cleanup of old specifications                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Challenge 5: Manual workflow is error-prone                     │
│  Solution: One-Command Verification                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ python verify_all_router_samples.py \                      │  │
│  │   --model_path meta_moe_*.pth \                            │  │
│  │   --num_mnist 100 --num_cifar 100                          │  │
│  │                                                            │  │
│  │ Automatically:                                             │  │
│  │   1. Exports router to ONNX                                │  │
│  │   2. Generates VNNLIB specifications                       │  │
│  │   3. Runs verification                                     │  │
│  │   4. Generates comprehensive report                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Verification Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│              End-to-End Verification Workflow                    │
│                                                                  │
│  Input: Trained MetaMoE model (.pth file)                        │
│     │                                                            │
│     v                                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Step 1: Export Router to ONNX                              │  │
│  │ python export_router_to_abcrown.py                         │  │
│  │   --model_path meta_moe_*.pth                              │  │
│  │   --output_path router_only.onnx                           │  │
│  └──────────────────┬─────────────────────────────────────────┘  │
│                     │                                            │
│                     v                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Step 2: Generate VNNLIB Specifications                     │  │
│  │ python prepare_router_verification.py                      │  │
│  │   --num_mnist 100 --num_cifar 100                          │  │
│  │                                                            │  │
│  │ Generates:                                                 │  │
│  │   - 100 MNIST specs: router_mnist_*.vnnlib                 │  │
│  │   - 100 CIFAR specs: router_cifar_*.vnnlib                 │  │
│  │                                                            │  │
│  │ Each VNNLIB file specifies:                                │  │
│  │   - Input constraints (epsilon ball)                       │  │
│  │   - Output property (argmax doesn't change)                │  │
│  └──────────────────┬─────────────────────────────────────────┘  │
│                     │                                            │
│                     v                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Step 3: Run Verification                                   │  │
│  │ cd modules/alpha-beta-CROWN/complete_verifier              │  │
│  │ python abcrown.py \                                        │  │
│  │   --config exp_configs/moe_experts/router_linf.yaml        │  │
│  │                                                            │  │
│  │ For each VNNLIB spec:                                      │  │
│  │   - Load ONNX model                                        │  │
│  │   - Construct input constraints                            │  │
│  │   - Perform bound propagation (CROWN)                      │  │
│  │   - Branch and bound if needed                             │  │
│  │   - Return: VERIFIED / FALSIFIED / TIMEOUT                 │  │
│  └──────────────────┬─────────────────────────────────────────┘  │
│                     │                                            │
│                     v                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Step 4: Generate Report                                    │  │
│  │ Output: router_verification_results.txt                    │  │
│  │                                                            │  │
│  │ ========================================                   │  │
│  │ VERIFICATION SUMMARY                                       │  │
│  │ ========================================                   │  │
│  │ Total samples: 200                                         │  │
│  │   Verified:   198 (99.0%)                                  │  │
│  │   Falsified:  2 (1.0%)                                     │  │
│  │   Timeout:    0 (0.0%)                                     │  │
│  │                                                            │  │
│  │ Total time: 2,164 seconds                                  │  │
│  │ Average time: 10.82 seconds/sample                         │  │
│  │ ========================================                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Command Cheat Sheet

```bash
# Individual Expert Training
python train.py --dataset GTSRB --model_arch ultra_verifiable_cnn --epochs 100 --adv_training

# MetaMoE Training (2 experts)
python train.py --meta_moe \
    --model_arch ultra_verifiable_cnn \
    --gating_backbone ultra_verifiable_cnn \
    --gtsrb_model_path artifacts/gtsrb_*_best.pth \
    --cifar10_model_path artifacts/cifar10_*_best.pth \
    --epochs 100

# Fine-Tune MetaMoE (add expert)
python train.py --meta_moe --fine_tune_meta_moe \
    --model_arch ultra_verifiable_cnn \
    --gating_backbone ultra_verifiable_cnn \
    --meta_moe_path artifacts/meta_moe_*_best.pth \
    --mnist_model_path artifacts/mnist_*_best.pth \
    --epochs 50

# Router Verification
python verify_all_router_samples.py \
    --model_path artifacts/meta_moe_*_best.pth \
    --num_mnist 10 --num_cifar 10

# Expert Verification
python src/Formal_Neural_Network_Verification/verify_expert_abcrown.py \
    --model_path artifacts/gtsrb_*_best.pth \
    --dataset GTSRB \
    --epsilon 0.00784 \
    --num_images 10

# WebGME Startup
setup\start-local.bat              # Windows
./setup/start-local.sh             # Linux/macOS
# Access: http://127.0.0.1:8888
```

### File Structure Overview

```
Project Root
├── D:\Fall2025\MIC\webgme\                    # WebGME Application
│   ├── src/plugins/MoE_Metamodel_ver1/        # Metamodel plugin
│   ├── MoE_QUICKSTART.md                      # Quick start guide
│   └── setup/start-local.bat                  # Startup script
│
└── D:\Mixture-of-Experts_Research\            # Research Codebase
    ├── src/Vision_Transformer_Pytorch/
    │   ├── train_moe.py                       # Main training script
    │   ├── vision_transformer_moe.py          # MoE architectures
    │   ├── small_expert.py                    # Expert CNNs
    │   └── meta_moe_eval.py                   # Evaluation
    │
    ├── src/Formal_Neural_Network_Verification/
    │   ├── alpha-beta-crown/                  # Verification scripts
    │   │   ├── export_router_to_abcrown.py    # Router ONNX export
    │   │   ├── generate_router_vnnlib.py      # Spec generation
    │   │   └── verify_all_router_samples.py   # End-to-end verify
    │   │
    │   └── NNV_VERIFICATION_GUIDE.md          # NNV guide (limited)
    │
    ├── artifacts/                             # Output models
    │   ├── *_best.pth                         # Trained models
    │   ├── *.onnx                             # ONNX exports
    │   └── router_verification_results.txt    # Verification reports
    │
    ├── data/                                  # Datasets
    │   ├── GTSRB/
    │   ├── CIFAR10/
    │   └── MNIST/
    │
    └── modules/
        ├── alpha-beta-CROWN/                  # Verification engine
        └── nnv_moe/                           # NNV (limited use)
```

### Key Terminology

```
┌──────────────────────────────────────────────────────────────────┐
│                       Glossary                                   │
├─────────────────────┬────────────────────────────────────────────┤
│ Term                │ Definition                                 │
├─────────────────────┼────────────────────────────────────────────┤
│ MoE                 │ Mixture-of-Experts: multiple specialized   │
│                     │ models with routing mechanism              │
├─────────────────────┼────────────────────────────────────────────┤
│ MetaMoE             │ Dataset-level MoE system (router +         │
│                     │ frozen experts)                            │
├─────────────────────┼────────────────────────────────────────────┤
│ Router / Gating Net │ Network that selects which expert to use   │
├─────────────────────┼────────────────────────────────────────────┤
│ Expert              │ Specialized neural network for one domain  │
├─────────────────────┼────────────────────────────────────────────┤
│ Top-K               │ Number of experts activated per input      │
│                     │ (typically 1 for sparse routing)           │
├─────────────────────┼────────────────────────────────────────────┤
│ Meta-class          │ Dataset identifier (0=GTSRB, 1=CIFAR,      │
│                     │ 2=MNIST)                                   │
├─────────────────────┼────────────────────────────────────────────┤
│ TRADES              │ Adversarial training method via KL         │
│                     │ divergence minimization                    │
├─────────────────────┼────────────────────────────────────────────┤
│ alpha-beta-CROWN    │ State-of-the-art neural network verifier   │
│                     │ (VNN-COMP winner)                          │
├─────────────────────┼────────────────────────────────────────────┤
│ VNNLIB              │ Verification property format (input        │
│                     │ constraints + output property)             │
├─────────────────────┼────────────────────────────────────────────┤
│ Epsilon (ε)         │ Perturbation bound for robustness          │
│                     │ (e.g., ε=2/255)                            │
├─────────────────────┼────────────────────────────────────────────┤
│ WebGME              │ Web-based Generic Modeling Environment     │
│                     │ (visual modeling tool)                     │
├─────────────────────┼────────────────────────────────────────────┤
│ DSML                │ Domain-Specific Modeling Language          │
│                     │ (visual language for MoE)                  │
├─────────────────────┼────────────────────────────────────────────┤
│ BatchNorm Folding   │ Merging BatchNorm parameters into          │
│                     │ convolutional weights (for verification)   │
└─────────────────────┴────────────────────────────────────────────┘
```

---

## Conclusion

This Mixture-of-Experts project combines:
- **Hierarchical architecture** (dataset + token level routing)
- **Formal verification** (alpha-beta-CROWN for provable safety)
- **Visual modeling** (WebGME for graphical design)
- **Incremental learning** (frozen experts, add new domains easily)
- **Adversarial robustness** (TRADES training for resilience)

**Target applications**: Safety-critical systems (autonomous vehicles, medical devices, industrial control) where provable correctness is essential.

**Current status**:
- [Checkmark] Core MoE implementation complete
- [Checkmark] Formal verification pipeline working (100% success on router)
- [Checkmark] Visual metamodel in WebGME
- [In Progress] Code generation from visual models (future work)
- [In Progress] Bidirectional sync between models and code (future work)

For more details, see:
- [MoE_QUICKSTART.md](MoE_QUICKSTART.md) - Quick start guide
- [src/plugins/MoE_Metamodel_ver1/README.md](src/plugins/MoE_Metamodel_ver1/README.md) - Metamodel reference
- [D:\Mixture-of-Experts_Research\CLAUDE.md](D:\Mixture-of-Experts_Research\CLAUDE.md) - Research codebase guide
