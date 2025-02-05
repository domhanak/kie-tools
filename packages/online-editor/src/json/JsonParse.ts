/*
 * Copyright 2021 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export function jsonParseWithDate(json: string): object {
  return JSON.parse(json, (_key: string, value: any) => {
    const regexISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    return typeof value === "string" && regexISO.test(value) ? new Date(value) : value;
  });
}

export function jsonParseWithUrl<T>(json: string): T {
  return JSON.parse(json, (_key: string, value: any) => {
    try {
      return new URL(value);
    } catch (e) {
      return value;
    }
  }) as T;
}
