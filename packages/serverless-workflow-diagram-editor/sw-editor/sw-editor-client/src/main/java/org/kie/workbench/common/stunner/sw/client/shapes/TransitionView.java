/*
 * Copyright 2016 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.kie.workbench.common.stunner.sw.client.shapes;

import com.ait.lienzo.client.core.shape.AbstractDirectionalMultiPointShape;
import com.ait.lienzo.client.core.shape.MultiPath;
import com.ait.lienzo.client.core.shape.MultiPathDecorator;
import com.ait.lienzo.client.core.shape.PolyLine;
import com.ait.lienzo.shared.core.types.ColorName;
import org.kie.workbench.common.stunner.client.lienzo.shape.view.wires.ext.WiresConnectorViewExt;
import org.kie.workbench.common.stunner.core.client.shape.view.event.ShapeViewSupportedEvents;

import static org.kie.workbench.common.stunner.sw.client.shapes.TransitionShapeDef.Direction.BOTH;
import static org.kie.workbench.common.stunner.sw.client.shapes.TransitionShapeDef.Direction.ONE;

public class TransitionView extends WiresConnectorViewExt<TransitionView> {

    private static final double SELECTION_OFFSET = 30;
    private static final double DECORATOR_WIDTH = 10;
    private static final double DECORATOR_HEIGHT = 15;

    public TransitionView() {
        this(0, 0, 100, 100);
    }

    public TransitionView(final double... points) {
        this(createLine(new PolyLine(points), ONE));
    }

    private TransitionView(final Object[] line) {
        super(ShapeViewSupportedEvents.DESKTOP_CONNECTOR_EVENT_TYPES,
              (PolyLine) line[0],
              (MultiPathDecorator) line[1],
              (MultiPathDecorator) line[2]);
    }

    static Object[] createLine(AbstractDirectionalMultiPointShape<?> line,
                               TransitionShapeDef.Direction direction) {

        // The head decorator must be not visible, as connectors are unidirectional.
        final MultiPath head = BOTH.equals(direction)
                ? getArrowMultiPath()
                : new MultiPath();
        final MultiPath tail = BOTH.equals(direction) || ONE.equals(direction)
                ? getArrowMultiPath()
                : new MultiPath();

        line.setDraggable(true);
        line.setSelectionStrokeOffset(SELECTION_OFFSET);
        line.setHeadOffset(head.getBoundingBox().getHeight());
        line.setTailOffset(tail.getBoundingBox().getHeight());

        final MultiPathDecorator headDecorator = new MultiPathDecorator(head);
        final MultiPathDecorator tailDecorator = new MultiPathDecorator(tail);

        return new Object[]{line, headDecorator, tailDecorator};
    }

    private static MultiPath getArrowMultiPath() {
        return new MultiPath()
                .M(DECORATOR_WIDTH,
                   DECORATOR_HEIGHT)
                .L(0,
                   DECORATOR_HEIGHT)
                .L(DECORATOR_WIDTH / 2,
                   0)
                .Z()
                .setFillColor(ColorName.BLACK)
                .setFillAlpha(1);
    }
}