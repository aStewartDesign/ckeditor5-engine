/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ModelDocument from '../../src/model/document';
import DataController from '../../src/controller/datacontroller';
import HtmlDataProcessor from '../../src/dataprocessor/htmldataprocessor';

import buildViewConverter  from '../../src/conversion/buildviewconverter';
import buildModelConverter  from '../../src/conversion/buildmodelconverter';

import ModelDocumentFragment from '../../src/model/documentfragment';
import ModelElement from '../../src/model/element';
import ModelText from '../../src/model/text';
import ModelSelection from '../../src/model/selection';
import ModelRange from '../../src/model/range';

import ViewDocumentFragment from '../../src/view/documentfragment';

import { getData, setData, stringify, parse as parseModel } from '../../src/dev-utils/model';
import { parse as parseView } from '../../src/dev-utils/view';

import count from '@ckeditor/ckeditor5-utils/src/count';

describe( 'DataController', () => {
	let modelDocument, htmlDataProcessor, data, schema;

	beforeEach( () => {
		modelDocument = new ModelDocument();
		modelDocument.createRoot();
		modelDocument.createRoot( '$root', 'title' );

		htmlDataProcessor = new HtmlDataProcessor();

		data = new DataController( modelDocument, htmlDataProcessor );

		schema = modelDocument.schema;
	} );

	describe( 'constructor()', () => {
		it( 'works without data processor', () => {
			const data = new DataController( modelDocument );

			expect( data.processor ).to.be.undefined;
		} );

		it( 'should add insertContent listener', () => {
			const batch = modelDocument.batch();
			const content = new ModelDocumentFragment( [ new ModelText( 'x' ) ] );

			schema.registerItem( 'paragraph', '$block' );

			setData( modelDocument, '<paragraph>a[]b</paragraph>' );

			data.fire( 'insertContent', { content, selection: modelDocument.selection, batch } );

			expect( getData( modelDocument ) ).to.equal( '<paragraph>ax[]b</paragraph>' );
			expect( batch.deltas.length ).to.be.above( 0 );
		} );

		it( 'should add deleteContent listener', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( modelDocument, '<paragraph>f[oo</paragraph><paragraph>ba]r</paragraph>' );

			const batch = modelDocument.batch();

			data.fire( 'deleteContent', { batch, selection: modelDocument.selection } );

			expect( getData( modelDocument ) ).to.equal( '<paragraph>f[]</paragraph><paragraph>r</paragraph>' );
			expect( batch.deltas ).to.not.be.empty;
		} );

		it( 'should add deleteContent listener which passes ', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( modelDocument, '<paragraph>f[oo</paragraph><paragraph>ba]r</paragraph>' );

			const batch = modelDocument.batch();

			data.fire( 'deleteContent', {
				batch,
				selection: modelDocument.selection,
				options: { merge: true }
			} );

			expect( getData( modelDocument ) ).to.equal( '<paragraph>f[]r</paragraph>' );
		} );

		it( 'should add modifySelection listener', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( modelDocument, '<paragraph>foo[]bar</paragraph>' );

			data.fire( 'modifySelection', {
				selection: modelDocument.selection,
				options: {
					direction: 'backward'
				}
			} );

			expect( getData( modelDocument ) )
				.to.equal( '<paragraph>fo[o]bar</paragraph>' );
			expect( modelDocument.selection.isBackward ).to.true;
		} );

		it( 'should add getSelectedContent listener', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( modelDocument, '<paragraph>fo[ob]ar</paragraph>' );

			const evtData = {
				selection: modelDocument.selection
			};

			data.fire( 'getSelectedContent', evtData );

			expect( stringify( evtData.content ) ).to.equal( 'ob' );
		} );
	} );

	describe( 'parse', () => {
		it( 'should set text', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			const { modelItem } = data.parse( '<p>foo<b>bar</b></p>' );

			expect( stringify( modelItem ) ).to.equal( 'foobar' );
		} );

		it( 'should set paragraph', () => {
			schema.registerItem( 'paragraph', '$block' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );

			const { modelItem } = data.parse( '<p>foo<b>bar</b></p>' );

			expect( stringify( modelItem ) ).to.equal( '<paragraph>foobar</paragraph>' );
		} );

		it( 'should set two paragraphs', () => {
			schema.registerItem( 'paragraph', '$block' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );

			const { modelItem } = data.parse( '<p>foo</p><p>bar</p>' );

			expect( stringify( modelItem ) ).to.equal(
				'<paragraph>foo</paragraph><paragraph>bar</paragraph>' );
		} );

		it( 'should set paragraphs with bold', () => {
			schema.registerItem( 'paragraph', '$block' );
			schema.allow( { name: '$text', attributes: [ 'bold' ], inside: '$block' } );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );
			buildViewConverter().for( data.viewToModel ).fromElement( 'b' ).toAttribute( 'bold', true );

			const { modelItem } = data.parse( '<p>foo<b>bar</b></p>' );

			expect( stringify( modelItem ) ).to.equal(
				'<paragraph>foo<$text bold="true">bar</$text></paragraph>' );
		} );

		it( 'should return markers data', () => {
			schema.registerItem( 'paragraph', '$block' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );
			buildViewConverter().for( data.viewToModel ).fromElement( 'marker' ).toMarker();

			const { markersData } = data.parse( '<p>f<marker data-name="search"></marker>oob<marker data-name="search"></marker>ar</p>' );

			expect( markersData ).to.instanceof( Map );
			expect( markersData.size ).to.equal( 1 );
			expect( markersData.get( 'search'  ) ).to.deep.equal( { startPath: [ 0, 1 ], endPath: [ 0, 4 ] } );
		} );

		it( 'should parse in the root context by default', () => {
			const { modelItem } = data.parse( 'foo' );

			expect( stringify( modelItem ) ).to.equal( '' );
		} );

		it( 'should accept parsing context', () => {
			const { modelItem } = data.parse( 'foo', '$block' );

			expect( stringify( modelItem ) ).to.equal( 'foo' );
		} );
	} );

	describe( 'toModel', () => {
		beforeEach( () => {
			schema.registerItem( 'paragraph', '$block' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );
		} );

		it( 'should convert content of an element #1', () => {
			const viewElement = parseView( '<p>foo</p>' );
			const { modelItem } = data.toModel( viewElement );

			expect( modelItem ).to.be.instanceOf( ModelElement );
			expect( stringify( modelItem ) ).to.equal( '<paragraph>foo</paragraph>' );
		} );

		it( 'should convert content of an element #2', () => {
			const viewFragment = parseView( '<p>foo</p><p>bar</p>' );
			const { modelItem } = data.toModel( viewFragment );

			expect( modelItem ).to.be.instanceOf( ModelDocumentFragment );
			expect( stringify( modelItem ) ).to.equal( '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );
		} );

		it( 'should convert marker stamps', () => {
			const viewElement = parseView( '<p>f<marker data-name="search"></marker>o<marker data-name="search"></marker>o</p>' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'marker' ).toMarker();

			const { markersData } = data.toModel( viewElement );

			expect( markersData ).to.instanceof( Map );
			expect( markersData.size ).to.equal( 1 );
			expect( markersData.get( 'search'  ) ).to.deep.equal( { startPath: [ 1 ], endPath: [ 2 ] } );
		} );

		it( 'should accept parsing context', () => {
			modelDocument.createRoot( 'inlineRoot', 'inlineRoot' );

			schema.registerItem( 'inlineRoot' );
			schema.allow( { name: '$text', inside: 'inlineRoot' } );

			const viewFragment = new ViewDocumentFragment( [ parseView( 'foo' ) ] );

			// Model fragment in root.
			expect( stringify( data.toModel( viewFragment ).modelItem ) ).to.equal( '' );

			// Model fragment in inline root.
			expect( stringify( data.toModel( viewFragment, 'inlineRoot' ).modelItem ) ).to.equal( 'foo' );
		} );
	} );

	describe( 'set', () => {
		it( 'should set data to root', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			data.set( 'foo' );

			expect( getData( modelDocument, { withoutSelection: true } ) ).to.equal( 'foo' );
		} );

		it( 'should set markers to `modelDocument#markers` collection', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );
			buildViewConverter().for( data.viewToModel ).fromElement( 'm' ).toMarker();

			data.set(
				'<p>' +
					'Fo' +
					'<m data-name="search"></m>' +
					'o ba' +
					'<m data-name="comment"></m>' +
					'r bi' +
					'<m data-name="search"></m>' +
					'z' +
				'</p>'
			);

			expect( Array.from( modelDocument.markers ).length ).to.equal( 2 );

			const paragraph = modelDocument.getRoot().getChild( 0 );
			const commentMarkerRange = ModelRange.createFromParentsAndOffsets( paragraph, 6, paragraph, 6 );
			const searchMarkerRange = ModelRange.createFromParentsAndOffsets( paragraph, 2, paragraph, 10 );

			expect( modelDocument.markers.get( 'comment' ).getRange().isEqual( commentMarkerRange ) ).to.true;
			expect( modelDocument.markers.get( 'search' ).getRange().isEqual( searchMarkerRange ) ).to.true;
		} );

		it( 'should create a batch', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			data.set( 'foo' );

			expect( count( modelDocument.history.getDeltas() ) ).to.equal( 1 );
		} );

		it( 'should fire #changesDone', () => {
			const spy = sinon.spy();

			schema.allow( { name: '$text', inside: '$root' } );
			modelDocument.on( 'changesDone', spy );

			data.set( 'foo' );

			expect( spy.calledOnce ).to.be.true;
		} );

		it( 'should get root name as a parameter', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			data.set( 'foo', 'main' );
			data.set( 'Bar', 'title' );

			expect( getData( modelDocument, { withoutSelection: true, rootName: 'main' } ) ).to.equal( 'foo' );
			expect( getData( modelDocument, { withoutSelection: true, rootName: 'title' } ) ).to.equal( 'Bar' );

			expect( count( modelDocument.history.getDeltas() ) ).to.equal( 2 );
		} );

		// This case was added when order of params was different and it really didn't work. Let's keep it
		// if anyone will ever try to change this.
		it( 'should allow setting empty data', () => {
			schema.allow( { name: '$text', inside: '$root' } );

			data.set( 'foo', 'title' );

			expect( getData( modelDocument, { withoutSelection: true, rootName: 'title' } ) ).to.equal( 'foo' );

			data.set( '', 'title' );

			expect( getData( modelDocument, { withoutSelection: true, rootName: 'title' } ) ).to.equal( '' );
		} );
	} );

	describe( 'get', () => {
		it( 'should get paragraph with text', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo</paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>foo</p>' );
		} );

		it( 'should get empty paragraph', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph></paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>&nbsp;</p>' );
		} );

		it( 'should get two paragraphs', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>foo</p><p>bar</p>' );
		} );

		it( 'should get text directly in root', () => {
			modelDocument.schema.allow( { name: '$text', inside: '$root' } );
			setData( modelDocument, 'foo' );

			expect( data.get() ).to.equal( 'foo' );
		} );

		it( 'should get paragraphs without bold', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo<$text bold="true">bar</$text></paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>foobar</p>' );
		} );

		it( 'should get paragraphs with bold', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo<$text bold="true">bar</$text></paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );
			buildModelConverter().for( data.modelToView ).fromAttribute( 'bold' ).toElement( 'b' );

			expect( data.get() ).to.equal( '<p>foo<b>bar</b></p>' );
		} );

		it( 'should get root name as a parameter', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			modelDocument.schema.allow( { name: '$text', inside: '$root' } );

			setData( modelDocument, '<paragraph>foo</paragraph>', { rootName: 'main' } );
			setData( modelDocument, 'Bar', { rootName: 'title' } );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );
			buildModelConverter().for( data.modelToView ).fromAttribute( 'bold' ).toElement( 'b' );

			expect( data.get() ).to.equal( '<p>foo</p>' );
			expect( data.get( 'main' ) ).to.equal( '<p>foo</p>' );
			expect( data.get( 'title' ) ).to.equal( 'Bar' );
		} );
	} );

	describe( 'stringify', () => {
		beforeEach( () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			modelDocument.schema.registerItem( 'div' );

			modelDocument.schema.allow( { name: '$block', inside: 'div' } );
			modelDocument.schema.allow( { name: 'div', inside: '$root' } );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );
		} );

		it( 'should stringify a content of an element', () => {
			const modelElement = parseModel( '<div><paragraph>foo</paragraph></div>', modelDocument.schema );

			expect( data.stringify( modelElement ) ).to.equal( '<p>foo</p>' );
		} );

		it( 'should stringify a content of a document fragment', () => {
			const modelDocumentFragment = parseModel( '<paragraph>foo</paragraph><paragraph>bar</paragraph>', modelDocument.schema );

			expect( data.stringify( modelDocumentFragment ) ).to.equal( '<p>foo</p><p>bar</p>' );
		} );
	} );

	describe( 'toView', () => {
		beforeEach( () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			modelDocument.schema.registerItem( 'div' );

			modelDocument.schema.allow( { name: '$block', inside: 'div' } );
			modelDocument.schema.allow( { name: 'div', inside: '$root' } );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );
		} );

		it( 'should convert a content of an element', () => {
			const modelElement = parseModel( '<div><paragraph>foo</paragraph></div>', modelDocument.schema );

			const viewDocumentFragment = data.toView( modelElement );

			expect( viewDocumentFragment ).to.be.instanceOf( ViewDocumentFragment );

			const viewElement = viewDocumentFragment.getChild( 0 );

			expect( viewElement.name ).to.equal( 'p' );
			expect( viewElement.childCount ).to.equal( 1 );
			expect( viewElement.getChild( 0 ).data ).to.equal( 'foo' );
		} );

		it( 'should convert a document fragment', () => {
			const modelDocumentFragment = parseModel( '<paragraph>foo</paragraph><paragraph>bar</paragraph>', modelDocument.schema );

			const viewDocumentFragment = data.toView( modelDocumentFragment );

			expect( viewDocumentFragment ).to.be.instanceOf( ViewDocumentFragment );
			expect( viewDocumentFragment ).to.have.property( 'childCount', 2 );

			const viewElement = viewDocumentFragment.getChild( 0 );

			expect( viewElement.name ).to.equal( 'p' );
			expect( viewElement.childCount ).to.equal( 1 );
			expect( viewElement.getChild( 0 ).data ).to.equal( 'foo' );
		} );
	} );

	describe( 'destroy', () => {
		it( 'should be there for you', () => {
			// Should not throw.
			data.destroy();

			expect( data ).to.respondTo( 'destroy' );
		} );
	} );

	describe( 'insertContent', () => {
		it( 'should fire the insertContent event', () => {
			const spy = sinon.spy();
			const content = new ModelDocumentFragment( [ new ModelText( 'x' ) ] );
			const batch = modelDocument.batch();
			schema.allow( { name: '$text', inside: '$root' } );

			data.on( 'insertContent', spy );

			data.insertContent( content, modelDocument.selection, batch );

			expect( spy.args[ 0 ][ 1 ] ).to.deep.equal( {
				batch: batch,
				selection: modelDocument.selection,
				content: content
			} );
		} );
	} );

	describe( 'deleteContent', () => {
		it( 'should fire the deleteContent event', () => {
			const spy = sinon.spy();
			const batch = modelDocument.batch();

			data.on( 'deleteContent', spy );

			data.deleteContent( modelDocument.selection, batch );

			const evtData = spy.args[ 0 ][ 1 ];

			expect( evtData.batch ).to.equal( batch );
			expect( evtData.selection ).to.equal( modelDocument.selection );
		} );
	} );

	describe( 'modifySelection', () => {
		it( 'should fire the deleteContent event', () => {
			const spy = sinon.spy();
			const opts = { direction: 'backward' };

			data.on( 'modifySelection', spy );

			data.modifySelection( modelDocument.selection, opts );

			const evtData = spy.args[ 0 ][ 1 ];

			expect( evtData.selection ).to.equal( modelDocument.selection );
			expect( evtData.options ).to.equal( opts );
		} );
	} );

	describe( 'getSelectedContent', () => {
		it( 'should fire the getSelectedContent event', () => {
			const spy = sinon.spy();
			const sel = new ModelSelection();

			data.on( 'getSelectedContent', spy );

			data.getSelectedContent( sel );

			const evtData = spy.args[ 0 ][ 1 ];

			expect( evtData.selection ).to.equal( sel );
		} );

		it( 'should return the evtData.content of the getSelectedContent event', () => {
			const frag = new ModelDocumentFragment();

			data.on( 'getSelectedContent', ( evt, data ) => {
				data.content = frag;

				evt.stop();
			}, { priority: 'high' } );

			expect( data.getSelectedContent() ).to.equal( frag );
		} );
	} );
} );
