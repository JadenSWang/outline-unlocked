import invariant from "invariant";
import { action, runInAction } from "mobx";
import { CollectionPermission } from "@shared/types";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { PAGINATION_SYMBOL, RPCAction } from "./base/Store";

export default class CollectionGroupMembershipsStore extends Store<CollectionGroupMembership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, CollectionGroupMembership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | undefined
  ): Promise<CollectionGroupMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.group_memberships`, params);
      invariant(res?.data, "Data not available");

      let response: CollectionGroupMembership[] = [];
      runInAction(`CollectionGroupMembershipsStore#fetchPage`, () => {
        res.data.groups.forEach(this.rootStore.groups.add);
        response = res.data.collectionGroupMemberships.map(this.add);
        this.isLoaded = true;
      });

      response[PAGINATION_SYMBOL] = res.pagination;
      return response;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  async create({
    collectionId,
    groupId,
    permission,
  }: {
    collectionId: string;
    groupId: string;
    permission?: CollectionPermission;
  }) {
    const res = await client.post("/collections.add_group", {
      id: collectionId,
      groupId,
      permission,
    });
    invariant(res?.data, "Membership data should be available");

    const cgm = res.data.collectionGroupMemberships.map(this.add);
    return cgm[0];
  }

  @action
  async delete({
    collectionId,
    groupId,
  }: {
    collectionId: string;
    groupId: string;
  }) {
    await client.post("/collections.remove_group", {
      id: collectionId,
      groupId,
    });
    const membership = Array.from(this.data.values()).find(
      (m) => m.groupId === groupId && m.collectionId === collectionId
    );
    if (membership) {
      this.remove(membership.id);
    }
  }

  @action
  removeCollectionMemberships = (collectionId: string) => {
    this.data.forEach((membership, key) => {
      if (membership.collectionId === collectionId) {
        this.remove(key);
      }
    });
  };

  /**
   * Find a collection group membership by collectionId and groupId
   *
   * @param collectionId The collection ID
   * @param groupId The group ID
   * @returns The collection group membership or undefined if not found.
   */
  find = (collectionId: string, groupId: string) =>
    Array.from(this.data.values()).find(
      (m) => m.groupId === groupId && m.collectionId === collectionId
    );
}
