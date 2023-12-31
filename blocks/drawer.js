import Block from './block.js';
/* optional imports */
import * as THREE from 'three';
import ThreeUtilities from '../threeUtilities.js';
import { CSG } from 'three-csg-ts';

export default class Drawer extends Block {
    constructor(sceneManager, parent, zIndex = 5) {
        super(sceneManager, parent, zIndex);
    }

    setParameters() {
        this.parameters = Drawer.parameters();
    }

    static parameters() {
        let param = super.parameters();
        /* update parameters custom to this block */
        param.name = "Drawer";

        param.referenceIsBottom= true;
        param.idealDistanceFromReference = 0;
        param.minDistanceFromReference = 0;
        param.verticalWeight = 10;

        param.rightSlotsOccupyAbove = 2 //how many slots above the reference slot it occupies. Including where it is attached
        param.rightSlotsOccupyBelow= 1
        param.leftSlotsOccupyAbove= 2
        param.leftSlotsOccupyBelow= 1
        param.centerSlotsOccupyAbove= 2
        param.centerSlotsOccupyBelow= 1

        param.slideHeight = 6;
        param.slideExtra = 0.375
        param.drawerHeight = 9;
        param.faceThickness = 0.75;
        param.faceExtra = 2.5; //above the height
        param.blockMargin = 0.25;

        param.sideThickness = 0.75;
        param.bottomThickness = 0.25;

        param.priority = 2,     
        param.onePerColumn = false,
        param.fillPerColumn = false,
        param.priority = 7

        return param;
    }

    /* customize if you need score that cannot be calculated with standard formula */
    scoreOption(column, zIndex) {
        return super.scoreOption(column, zIndex);
    }

    makeSlides() {
        let p = this.parameters;
        let slideGeometry = new THREE.BoxGeometry(p.slideExtra, this.depth - p.faceThickness, p.slideHeight);
        slideGeometry.translate(-(this.parent.width - this.parent.partitionThickness )/ 2 + p.slideExtra / 2, p.faceThickness / 2 - this.depth / 2 , 0);
        let slideMesh = new THREE.Mesh(slideGeometry, this.blockSlidesMaterial);
        slideMesh.add(ThreeUtilities.returnObjectOutline(slideMesh));
        this.blockObjectFixed.add(slideMesh);

        let slideGeometry2 = new THREE.BoxGeometry(p.slideExtra, this.depth - p.faceThickness, p.slideHeight);
        slideGeometry2.translate((this.parent.width - this.parent.partitionThickness )/ 2 - p.slideExtra / 2, p.faceThickness / 2 - this.depth / 2 , 0);
        let slideMesh2 = new THREE.Mesh(slideGeometry2, this.blockSlidesMaterial);
        slideMesh2.add(ThreeUtilities.returnObjectOutline(slideMesh2));
        this.blockObjectFixed.add(slideMesh2);
        
        //super.makeSlides();


    }

    makeMovingObject() {
        /* if customized, make sure to add this.makeClickable(object to click) */
        //super.makeMovingObject();

        /* make face of drawer */
        let p = this.parameters;
        let faceGeometry = new THREE.BoxGeometry(this.parent.width - this.parent.partitionThickness - p.blockMargin * 2, p.faceThickness, p.drawerHeight + p.faceExtra);
        faceGeometry.translate(0, p.faceThickness / 2 - this.depth, p.faceExtra / 2);

        this.blockMesh = new THREE.Mesh(faceGeometry, this.blockObjectMaterial);
        this.blockMesh.add(ThreeUtilities.returnObjectOutline(this.blockMesh));
        this.blockObjectMoving.add(this.blockMesh);

        this.makeClickable(this.blockMesh);

        /* make sides */

        let sideGeometry = new THREE.BoxGeometry(p.sideThickness, this.depth - p.faceThickness - p.sideThickness, p.drawerHeight);
        sideGeometry.translate(-(this.parent.width - this.parent.partitionThickness )/ 2 + p.sideThickness / 2 + p.blockMargin, p.faceThickness / 2 - this.depth / 2 - p.sideThickness /2  , 0);
        let sideMesh = new THREE.Mesh(sideGeometry, this.blockObjectMaterial);
        sideMesh.add(ThreeUtilities.returnObjectOutline(sideMesh));
        this.blockObjectMoving.add(sideMesh);

        let sideGeometry2 = new THREE.BoxGeometry(p.sideThickness, this.depth - p.faceThickness - p.sideThickness, p.drawerHeight);
        sideGeometry2.translate((this.parent.width - this.parent.partitionThickness )/ 2 - p.sideThickness / 2 - p.blockMargin, p.faceThickness / 2 - this.depth / 2 - p.sideThickness / 2 , 0);
        let sideMesh2 = new THREE.Mesh(sideGeometry2, this.blockObjectMaterial);
        sideMesh2.add(ThreeUtilities.returnObjectOutline(sideMesh2));
        this.blockObjectMoving.add(sideMesh2);

        /* make back */
        let backGeometry = new THREE.BoxGeometry(this.parent.width - this.parent.partitionThickness - p.blockMargin * 2, p.sideThickness, p.drawerHeight);
        backGeometry.translate(0, -p.sideThickness / 2 , 0);
        let backMesh = new THREE.Mesh(backGeometry, this.blockObjectMaterial);
        backMesh.add(ThreeUtilities.returnObjectOutline(backMesh));
        this.blockObjectMoving.add(backMesh);

        /* make bottom */
        let bottomGeometry = new THREE.BoxGeometry(this.parent.width - this.parent.partitionThickness - p.blockMargin * 2 - p.sideThickness * 2, this.depth - p.faceThickness - p.sideThickness, p.bottomThickness);
        bottomGeometry.translate(0, p.faceThickness / 2 - this.depth / 2 - p.sideThickness / 2 - p.sideThickness , -p.drawerHeight / 2 + p.bottomThickness / 2);
        let bottomMesh = new THREE.Mesh(bottomGeometry, this.blockObjectMaterial);
        //bottomMesh.add(ThreeUtilities.returnObjectOutline(bottomMesh));
        this.blockObjectMoving.add(bottomMesh);

    }

    /* once done, also update shelf.js blockList and imports */

}