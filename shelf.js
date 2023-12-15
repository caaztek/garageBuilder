import { SceneEntity, ThreeUtilities } from './sceneManager.js';
import { LinearModifier, PlanarModifier } from './modifier.js';
import * as THREE from 'three';
import Column from './column.js';
import Block, { FixedShelf, PullShelf, PullDesk } from './block.js';

/* class containing all the information for a given shelf unit, made of many columns */
export default class Shelf extends SceneEntity {
    constructor(sceneManager, parent) {
        super(sceneManager, parent, "shelf");

        /* set defaults based on garage configuration */
        let garageLength = this.parent.length;
        this.startX = garageLength * 0.3;
        this.targetLength = garageLength * 0.4; //if using column width from default table, we'll try to get close.
        this.height = this.parent.height * 0.8;
        this.minHeight = 5;
        this.depth = 30;
        this.partitionThickness = 1.5;
        this.crossSupportThickness = 1.5;
        this.crossSupportHeight = 4;
        this.crossSupportStartZ = 10;
        this.partitionMaterial = new THREE.MeshLambertMaterial({ color: "#fff2cc" });
        this.modifierOffset = 3;
        this.verticalStep = 4; //big influence on all the blocks. Assume we start at height 0 for now.

        /* add GUI */
        this.showShelfModifier = true;
        this.addGUI();

        /* set columns */
        this.matchExactWidth = true; //if match then we can't use exact column width. Maybe just use them as guides.
        this.defaultWidthStep = 10; //all width will be a multiple of this. This is also the minimum width.
        this.defaultColumnWidths = [2, 4]; //as multiples of defaultWidthStep
        this.targetWidthMargin = 0;
        this.targetWidthMarginPerColumnTotal = 0.2;

        /* vertical partitions will be managed by the shelf */
        this.partitionObject = new THREE.Group();
        this.object.add(this.partitionObject);
        this.verticalPartitions = [];

        /* update rendering */
        this.setColumns();
        this.setModifiers();
        this.update();
    }

    switchModifierVisibility(value) {
        this.leftModifier.switchVisibility(value);
        this.rightModifier.switchVisibility(value);
        this.moveModifier.switchVisibility(value);

        this.columns.forEach((column) => {
            column.switchModifierVisibility(value);
        });
    }

    setColumns() {
        /* called everytime columns need to be recalculated */

        /* Erase all previous column info */
        if (this.columns) {
            this.columns.forEach((column) => {
                column.deleteEntity();
            });
        }
        this.columns = [];

        /* figure out the step. Will represent the subdivision that the entire shelf array will follow*/
        let step = this.defaultWidthStep;
        let numberOfSteps = Math.floor(this.targetLength / this.defaultWidthStep); //don't go over target length. minimum for this should be 1.
        if (this.matchExactWidth) {
            step = this.targetLength / numberOfSteps;
        }

        /* create an array of columns width using step and defaults. Many approachs possible. */
        this.defaultColumnWidths.sort((a, b) => a - b); //start with the thinnest.
        let targetStepsPerWidth = numberOfSteps / this.defaultColumnWidths.length;
        let currentWidthIndex = 0;
        let currentStep = 0;
        let stepsLeft = numberOfSteps;
        let currentStepsCurrentWidth = 0;
        let stepArray = []; //array represent the collection of column width (counted in step multiples)

        while (true) {
            let currentWidth = Math.min(this.defaultColumnWidths[currentWidthIndex], stepsLeft);
            stepArray.push(currentWidth);
            stepsLeft -= currentWidth;
            currentStep += currentWidth;
            currentStepsCurrentWidth += currentWidth;
            if (stepsLeft <= 0) break;
            if (currentStepsCurrentWidth >= targetStepsPerWidth) {
                currentWidthIndex++;
                currentStepsCurrentWidth = 0;
            }
        }
        /* reorder in case we had to add a small one at the end */
        stepArray.sort((a, b) => a - b);

        /* now we can create columns */
        let currentX = 0;
        stepArray.forEach((width) => {
            let newColumn = new Column(this.sceneManager, this, currentX, width * step, this.depth, this.height, this.columns.length)
            this.columns.push(newColumn);
            currentX += width * step;
        });
    }

    setModifiers() {
        this.leftModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(1)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startStartX = this.startX;
                    this.startTargetLength = this.targetLength;
                } else if (modifierType == "moved") {
                    this.startX = Math.min(Math.max(this.startStartX + modifier.offsetDistance, this.parent.wallThickness + this.partitionThickness / 2), this.startStartX + this.startTargetLength - this.defaultWidthStep);
                    this.targetLength = this.startTargetLength + this.startStartX - this.startX;
                    this.setColumns();
                    this.update();
                }
            })

        this.rightModifier = new LinearModifier(this.sceneManager, this, "line")
            .setScale(1)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startLength = this.targetLength;
                } else if (modifierType == "moved") {
                    this.targetLength = Math.max(Math.min(this.startLength + modifier.offsetDistance, this.parent.length - this.parent.wallThickness - this.startX - this.partitionThickness / 2), this.defaultWidthStep);
                    this.setColumns();
                    this.update();
                }
            })

        this.moveModifier = new LinearModifier(this.sceneManager, this, "arrow")
            .setScale(1)
            .updateDirection(this.sceneManager.xAxis, this.sceneManager.yAxis)
            .onUpdate((modifierType, modifier) => {
                if (modifierType == "clicked") {
                    this.startStartX = this.startX;
                    this.startLength = this.targetLength;
                } else if (modifierType == "moved") {
                    this.startX = Math.max(Math.min(this.startStartX + modifier.offsetDistance, this.parent.length - this.startLength - this.parent.wallThickness - this.partitionThickness / 2), this.parent.wallThickness + this.partitionThickness / 2);
                    this.object.position.set(this.startX, -this.parent.wallThickness, 0);
                }
            })
    }

    maxHeight() {
        let maxHeight = 0;
        this.columns.forEach((column) => {
            maxHeight = Math.max(maxHeight, column.height);
        });
        return maxHeight;
    }

    update() {
        /* called everytime the entire shelf is changed (partition size and position) and everything needs to be redrawn. */

        /* update object position everything in the shelf will be in reference to that*/
        this.object.position.set(this.startX, -this.parent.wallThickness, 0);

        /* make partitions */
        this.verticalPartitions.forEach((partitionObject) => {
            ThreeUtilities.disposeHierarchy(partitionObject);
        });
        let column;
        for (var i = 0; i < this.columns.length; i++) {
            column = this.columns[i];
            if (i == 0) this.makePartition(column.startX, column.height);
            else {
                let partitionHeight = Math.max(column.height, this.columns[i - 1].height);
                this.makePartition(column.startX, partitionHeight);
            }
        }
        this.makePartition(column.endX(), column.height);

        /* make cross support */
        ThreeUtilities.disposeHierarchy(this.crossSupport);
        let crossSupportGeom = new THREE.BoxGeometry(this.lastX() + this.partitionThickness, this.crossSupportThickness, this.crossSupportHeight);
        crossSupportGeom.translate(this.lastX() / 2, -this.depth + this.crossSupportThickness / 2, this.crossSupportStartZ);
        this.crossSupport = new THREE.Mesh(crossSupportGeom, this.partitionMaterial);
        this.crossSupport.add(ThreeUtilities.returnObjectOutline(this.crossSupport));
        this.object.add(this.crossSupport);

        /* update all the columns */
        this.columns.forEach((column) => { column.update() });

        /* update modifiers position */
        this.leftModifier.updatePosition(new THREE.Vector3(- this.modifierOffset, - this.depth, 10));
        this.rightModifier.updatePosition(new THREE.Vector3(this.lastX() + this.modifierOffset, - this.depth, 10));
        this.moveModifier.updatePosition(new THREE.Vector3(this.lastX() / 2, - this.depth, 0));

        /* fill shelf with interesting blocks */
        this.fillShelf();
    }

    lastX() {
        let lastColumn = this.columns[this.columns.length - 1];
        return lastColumn.endX();
    }

    makePartition(x, height) {
        /* columns don't own their partion, so this has to be handled by the shelf */
        let partitionGeom = new THREE.BoxGeometry(this.partitionThickness, this.depth, height);
        let partitionMesh = new THREE.Mesh(partitionGeom, this.partitionMaterial);
        partitionMesh.position.set(x, -this.depth / 2, height / 2);
        partitionMesh.add(ThreeUtilities.returnObjectOutline(partitionMesh));
        this.verticalPartitions.push(partitionMesh);
        this.partitionObject.add(partitionMesh);
    }

    fillShelf() {
        /* create blocks to fill the shelf */
        let blockList = Block.blockList();

        //let firstBlock = new blockList[0](this.sceneManager, column,10);
        while (true) {
            let bestScore = new FixedShelf(this.sceneManager, this).findBestPosition(true);
            if (bestScore.score == 0) break;
            //if (bestScore == 0) break;
        }
        //let block2 = new FixedShelf(this.sceneManager, this).findBestPosition(true)
        // let block3 = new PullShelf(this.sceneManager, this.columns[1],10);
        // let block4 = new PullDesk(this.sceneManager, this.columns[1],12);
        // let block5 = new PullDesk(this.sceneManager, this.columns[0],12);
        // let block6 = new PullDesk(this.sceneManager, this.columns[2],12);
    }

    addGUI() {
        super.addGUI();

        /* create GUI for filling preferences */
        let blockList = Block.blockList();
        this.shelfFilling = {}
        blockList.forEach((block) => {
            this.shelfFilling[block.parameters().name] = 0.5; //value between 0 and 1 to ask for more or less of a given block
            this.guiFolder.add(this.shelfFilling, block.parameters().name, 0, 1,1).step(0.1).onChange((value) => {
                //console.log(value);
            });
        });
    }

}