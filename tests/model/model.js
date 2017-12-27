/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import EmitterMixin from '@ckeditor/ckeditor5-utils/src/emittermixin';
import Model from '../../src/model/model';
import NoOperation from '../../src/model/operation/nooperation';
import deltaTransform from '../../src/model/delta/transform';
import Delta from '../../src/model/delta/delta';
import ModelText from '../../src/model/text';
import ModelRange from '../../src/model/range';
import ModelSelection from '../../src/model/selection';
import ModelDocumentFragment from '../../src/model/documentfragment';
import { getData, setData, stringify } from '../../src/dev-utils/model';

describe( 'Model', () => {
	let model, schema, changes;

	beforeEach( () => {
		model = new Model();
		model.document.createRoot();
		model.document.createRoot( '$root', 'title' );

		schema = model.schema;

		changes = '';
	} );

	describe( 'change & enqueueChange', () => {
		it( 'should execute changes immediately', () => {
			model.change( () => {
				changes += 'A';
			} );

			expect( changes ).to.equal( 'A' );
		} );

		it( 'should pass returned value', () => {
			const ret = model.change( () => {
				changes += 'A';

				return 'B';
			} );

			changes += ret;

			expect( changes ).to.equal( 'AB' );
		} );

		it( 'should not mixed the order when nested change is called', () => {
			const ret = model.change( () => {
				changes += 'A';

				nested();

				return 'D';
			} );

			changes += ret;

			expect( changes ).to.equal( 'ABCD' );

			function nested() {
				const ret = model.change( () => {
					changes += 'B';

					return 'C';
				} );

				changes += ret;
			}
		} );

		it( 'should execute enqueueChange immediately if its the first block', () => {
			model.enqueueChange( () => {
				changes += 'A';

				nested();
			} );

			expect( changes ).to.equal( 'ABC' );

			function nested() {
				const ret = model.change( () => {
					changes += 'B';

					return 'C';
				} );

				changes += ret;
			}
		} );

		it( 'should be possible to enqueueChange immediately if its the first block', () => {
			model.enqueueChange( () => {
				changes += 'A';

				nested();
			} );

			expect( changes ).to.equal( 'AB' );

			function nested() {
				model.change( () => {
					changes += 'B';
				} );
			}
		} );

		it( 'should be possible to nest change in enqueueChange', () => {
			model.enqueueChange( () => {
				changes += 'A';

				nested();

				changes += 'D';
			} );

			expect( changes ).to.equal( 'ABCD' );

			function nested() {
				const ret = model.change( () => {
					changes += 'B';

					return 'C';
				} );

				changes += ret;
			}
		} );

		it( 'should be possible to nest enqueueChange in enqueueChange', () => {
			model.enqueueChange( () => {
				changes += 'A';

				nestedEnqueue();

				changes += 'B';
			} );

			expect( changes ).to.equal( 'ABC' );

			function nestedEnqueue() {
				model.enqueueChange( () => {
					changes += 'C';
				} );
			}
		} );

		it( 'should be possible to nest enqueueChange in changes', () => {
			const ret = model.change( () => {
				changes += 'A';

				nestedEnqueue();

				changes += 'B';

				return 'D';
			} );

			changes += ret;

			expect( changes ).to.equal( 'ABCD' );

			function nestedEnqueue() {
				model.enqueueChange( () => {
					changes += 'C';
				} );
			}
		} );

		it( 'should be possible to nest enqueueChange in enqueueChange event', () => {
			model.once( '_change', () => {
				changes += 'B';
			} );

			model.enqueueChange( () => {
				model.enqueueChange( () => {
					changes += 'C';
				} );

				changes += 'A';
			} );

			expect( changes ).to.equal( 'ABC' );
		} );

		it( 'should be possible to nest enqueueChange in changes event', () => {
			model.once( '_change', () => {
				changes += 'B';
			} );

			model.change( () => {
				model.enqueueChange( () => {
					changes += 'C';
				} );

				changes += 'A';
			} );

			expect( changes ).to.equal( 'ABC' );
		} );

		it( 'should be possible to nest changes in enqueueChange event', () => {
			model.once( '_change', () => {
				changes += 'C';
			} );

			model.enqueueChange( () => {
				model.change( () => {
					changes += 'A';
				} );

				changes += 'B';
			} );

			expect( changes ).to.equal( 'ABC' );
		} );

		it( 'should be possible to nest changes in changes event', () => {
			model.once( '_change', () => {
				changes += 'C';
			} );

			model.change( () => {
				model.change( () => {
					changes += 'A';
				} );

				changes += 'B';
			} );

			expect( changes ).to.equal( 'ABC' );
		} );

		it( 'should let mix blocks', () => {
			model.once( '_change', () => {
				model.change( () => {
					changes += 'B';

					nestedEnqueue();
				} );

				model.change( () => {
					changes += 'C';
				} );

				changes += 'D';
			} );

			model.change( () => {
				changes += 'A';
			} );

			expect( changes ).to.equal( 'ABCDE' );

			function nestedEnqueue() {
				model.enqueueChange( () => {
					changes += 'E';
				} );
			}
		} );

		it( 'should use the same writer in all change blocks (change & change)', () => {
			model.change( outerWriter => {
				model.change( innerWriter => {
					expect( innerWriter ).to.equal( outerWriter );
				} );
			} );
		} );

		it( 'should create new writer in enqueue block', () => {
			model.change( outerWriter => {
				model.enqueueChange( innerWriter => {
					expect( innerWriter ).to.not.equal( outerWriter );
					expect( innerWriter.batch ).to.not.equal( outerWriter.batch );
				} );
			} );
		} );

		it( 'should let you pass batch', () => {
			let outerBatch;

			model.change( outerWriter => {
				outerBatch = outerWriter.batch;

				model.enqueueChange( outerBatch, innerWriter => {
					expect( innerWriter.batch ).to.equal( outerBatch );
				} );
			} );
		} );

		it( 'should let you create transparent batch', () => {
			model.enqueueChange( 'transparent', writer => {
				expect( writer.batch.type ).to.equal( 'transparent' );
			} );
		} );
	} );

	describe( 'applyOperation', () => {
		it( 'should execute provided operation', () => {
			const operation = {
				_execute: sinon.spy(),
				_validate: () => true
			};

			model.applyOperation( operation );

			sinon.assert.calledOnce( operation._execute );
		} );
	} );

	describe( 'transformDeltas', () => {
		it( 'should use deltaTransform.transformDeltaSets', () => {
			sinon.spy( deltaTransform, 'transformDeltaSets' );

			// Prepare some empty-ish deltas so the transformation won't throw an error.
			const deltasA = [ new Delta() ];
			deltasA[ 0 ].addOperation( new NoOperation( 0 ) );

			const deltasB = [ new Delta() ];
			deltasB[ 0 ].addOperation( new NoOperation( 0 ) );

			model.transformDeltas( deltasA, deltasB );

			expect( deltaTransform.transformDeltaSets.calledOnce ).to.be.true;
			expect( deltaTransform.transformDeltaSets.calledWith( deltasA, deltasB, null ) ).to.be.true;

			deltaTransform.transformDeltaSets.restore();
		} );

		it( 'should pass itself to transformDeltaSets if useContext was set to true', () => {
			sinon.spy( deltaTransform, 'transformDeltaSets' );

			// Prepare some empty-ish deltas so the transformation won't throw an error.
			const deltasA = [ new Delta() ];
			deltasA[ 0 ].addOperation( new NoOperation( 0 ) );

			const deltasB = [ new Delta() ];
			deltasB[ 0 ].addOperation( new NoOperation( 0 ) );

			model.transformDeltas( deltasA, deltasB, true );

			expect( deltaTransform.transformDeltaSets.calledOnce ).to.be.true;
			expect( deltaTransform.transformDeltaSets.calledWith( deltasA, deltasB, model.document ) ).to.be.true;

			deltaTransform.transformDeltaSets.restore();
		} );
	} );

	describe( 'insertContent()', () => {
		it( 'should be decorated', () => {
			schema.allow( { name: '$text', inside: '$root' } ); // To surpress warnings.

			const spy = sinon.spy();

			model.on( 'insertContent', spy );

			model.insertContent( new ModelText( 'a' ), model.document.selection );

			expect( spy.calledOnce ).to.be.true;
		} );

		it( 'should insert content (item)', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[]ar</paragraph>' );

			model.insertContent( new ModelText( 'ob' ), model.document.selection );

			expect( getData( model ) ).to.equal( '<paragraph>foob[]ar</paragraph>' );
		} );

		it( 'should insert content (document fragment)', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[]ar</paragraph>' );

			model.insertContent( new ModelDocumentFragment( [ new ModelText( 'ob' ) ] ), model.document.selection );

			expect( getData( model ) ).to.equal( '<paragraph>foob[]ar</paragraph>' );
		} );

		it( 'should use parent batch', () => {
			schema.registerItem( 'paragraph', '$block' );
			setData( model, '<paragraph>[]</paragraph>' );

			model.change( writer => {
				model.insertContent( new ModelText( 'abc' ), model.document.selection );
				expect( writer.batch.deltas ).to.length( 1 );
			} );
		} );
	} );

	describe( 'deleteContent()', () => {
		it( 'should be decorated', () => {
			const spy = sinon.spy();

			model.on( 'deleteContent', spy );

			model.deleteContent( model.document.selection );

			expect( spy.calledOnce ).to.be.true;
		} );

		it( 'should delete selected content', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[ob]ar</paragraph>' );

			model.deleteContent( model.document.selection );

			expect( getData( model ) ).to.equal( '<paragraph>fo[]ar</paragraph>' );
		} );

		it( 'should use parent batch', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[ob]ar</paragraph>' );

			model.change( writer => {
				model.deleteContent( model.document.selection );
				expect( writer.batch.deltas ).to.length( 1 );
			} );
		} );
	} );

	describe( 'modifySelection()', () => {
		it( 'should be decorated', () => {
			schema.registerItem( 'paragraph', '$block' );
			setData( model, '<paragraph>fo[ob]ar</paragraph>' );

			const spy = sinon.spy();

			model.on( 'modifySelection', spy );

			model.modifySelection( model.document.selection );

			expect( spy.calledOnce ).to.be.true;
		} );

		it( 'should modify a selection', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[ob]ar</paragraph>' );

			model.modifySelection( model.document.selection, { direction: 'backward' } );

			expect( getData( model ) ).to.equal( '<paragraph>fo[o]bar</paragraph>' );
		} );
	} );

	describe( 'getSelectedContent()', () => {
		it( 'should be decorated', () => {
			const spy = sinon.spy();
			const sel = new ModelSelection();

			model.on( 'getSelectedContent', spy );

			model.getSelectedContent( sel );

			expect( spy.calledOnce ).to.be.true;
		} );

		it( 'should return selected content', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[ob]ar</paragraph>' );

			const content = model.getSelectedContent( model.document.selection );

			expect( stringify( content ) ).to.equal( 'ob' );
		} );

		it( 'should use parent batch', () => {
			schema.registerItem( 'paragraph', '$block' );

			setData( model, '<paragraph>fo[ob]ar</paragraph>' );

			model.change( writer => {
				model.getSelectedContent( model.document.selection );
				expect( writer.batch.deltas ).to.length( 1 );
			} );
		} );
	} );

	describe( 'hasContent()', () => {
		let root;

		beforeEach( () => {
			schema.registerItem( 'paragraph', '$block' );
			schema.registerItem( 'div', '$block' );
			schema.allow( { name: '$block', inside: 'div' } );
			schema.registerItem( 'image' );
			schema.allow( { name: 'image', inside: 'div' } );
			schema.objects.add( 'image' );

			setData(
				model,

				'<div>' +
				'<paragraph></paragraph>' +
				'</div>' +
				'<paragraph>foo</paragraph>' +
				'<div>' +
				'<image></image>' +
				'</div>'
			);

			root = model.document.getRoot();
		} );

		it( 'should return true if given element has text node', () => {
			const pFoo = root.getChild( 1 );

			expect( model.hasContent( pFoo ) ).to.be.true;
		} );

		it( 'should return true if given element has element that is an object', () => {
			const divImg = root.getChild( 2 );

			expect( model.hasContent( divImg ) ).to.be.true;
		} );

		it( 'should return false if given element has no elements', () => {
			const pEmpty = root.getChild( 0 ).getChild( 0 );

			expect( model.hasContent( pEmpty ) ).to.be.false;
		} );

		it( 'should return false if given element has only elements that are not objects', () => {
			const divP = root.getChild( 0 );

			expect( model.hasContent( divP ) ).to.be.false;
		} );

		it( 'should return true if there is a text node in given range', () => {
			const range = ModelRange.createFromParentsAndOffsets( root, 1, root, 2 );

			expect( model.hasContent( range ) ).to.be.true;
		} );

		it( 'should return true if there is a part of text node in given range', () => {
			const pFoo = root.getChild( 1 );
			const range = ModelRange.createFromParentsAndOffsets( pFoo, 1, pFoo, 2 );

			expect( model.hasContent( range ) ).to.be.true;
		} );

		it( 'should return true if there is element that is an object in given range', () => {
			const divImg = root.getChild( 2 );
			const range = ModelRange.createFromParentsAndOffsets( divImg, 0, divImg, 1 );

			expect( model.hasContent( range ) ).to.be.true;
		} );

		it( 'should return false if range is collapsed', () => {
			const range = ModelRange.createFromParentsAndOffsets( root, 1, root, 1 );

			expect( model.hasContent( range ) ).to.be.false;
		} );

		it( 'should return false if range has only elements that are not objects', () => {
			const range = ModelRange.createFromParentsAndOffsets( root, 0, root, 1 );

			expect( model.hasContent( range ) ).to.be.false;
		} );
	} );

	describe( 'destroy()', () => {
		it( 'should destroy document', () => {
			sinon.spy( model.document, 'destroy' );

			model.destroy();

			sinon.assert.calledOnce( model.document.destroy );
		} );

		it( 'should stop listening', () => {
			const emitter = Object.create( EmitterMixin );
			const spy = sinon.spy();

			model.listenTo( emitter, 'event', spy );

			model.destroy();

			emitter.fire( 'event' );

			sinon.assert.notCalled( spy );
		} );
	} );
} );
